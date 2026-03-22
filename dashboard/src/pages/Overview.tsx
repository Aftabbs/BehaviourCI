import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Shield, TrendingUp, Clock, GitBranch } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { supabase, type FeatureRow, type RunRow } from '../lib/supabase.ts';
import HealthScore from '../components/HealthScore.tsx';
import StatusBadge from '../components/StatusBadge.tsx';
import TrendChart from '../components/TrendChart.tsx';

interface FeatureWithRuns extends FeatureRow {
  recentRuns: RunRow[];
}

export default function Overview() {
  const [features, setFeatures] = useState<FeatureWithRuns[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: featuresData, error: featuresError } = await supabase
        .from('features')
        .select('*')
        .order('last_run_at', { ascending: false });

      if (featuresError) throw featuresError;
      if (!featuresData) { setFeatures([]); return; }

      // Load recent runs for each feature
      const featuresWithRuns = await Promise.all(
        featuresData.map(async (feature) => {
          const { data: runs } = await supabase
            .from('runs')
            .select('*')
            .eq('feature_name', feature.name)
            .order('created_at', { ascending: false })
            .limit(20);

          return { ...feature, recentRuns: runs ?? [] };
        })
      );

      setFeatures(featuresWithRuns);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to load features:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    // Realtime subscription — refresh when new runs come in
    const channel = supabase
      .channel('runs-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'runs' }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const healthyCount = features.filter((f) => (f.latest_score ?? 0) >= 85).length;
  const failingCount = features.filter((f) => (f.latest_score ?? 0) < 85 && f.last_run_at).length;
  const totalRuns = features.reduce((sum, f) => sum + f.run_count, 0);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">AI Feature Health</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Behavioral test results across all monitored features
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="btn-ghost"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Features', value: features.length, icon: Shield, color: 'text-brand-600 dark:text-brand-400' },
          { label: 'Healthy', value: healthyCount, icon: TrendingUp, color: 'text-green-600 dark:text-green-400' },
          { label: 'Failing', value: failingCount, icon: TrendingUp, color: 'text-red-600 dark:text-red-400' },
          { label: 'Total Runs', value: totalRuns, icon: GitBranch, color: 'text-gray-600 dark:text-gray-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Feature cards grid */}
      {loading && features.length === 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2 mb-6" />
              <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      ) : features.length === 0 ? (
        <div className="card p-12 text-center">
          <Shield className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No features tracked yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Run <code className="mono bg-gray-100 dark:bg-gray-800 px-1 rounded">behaviourci test</code> to start tracking
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => {
            const score = feature.latest_score ?? 0;
            const lastRun = feature.recentRuns[0];

            return (
              <Link
                key={feature.id}
                to={`/features/${encodeURIComponent(feature.name)}`}
                className="card p-5 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 transition-all group"
              >
                {/* Feature header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {feature.name}
                    </h3>
                    {feature.repo && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5 font-mono">
                        {feature.repo}
                      </p>
                    )}
                  </div>
                  <HealthScore score={score} size="sm" />
                </div>

                {/* Mini trend */}
                <div className="mb-4 -mx-1">
                  <TrendChart
                    runs={feature.recentRuns}
                    threshold={85}
                    height={60}
                    mini
                  />
                </div>

                {/* Footer stats */}
                <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                  <div className="flex items-center gap-1.5">
                    {lastRun && <StatusBadge passed={lastRun.passed} size="sm" />}
                    <span>{feature.run_count} runs</span>
                  </div>
                  {feature.last_run_at && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(parseISO(feature.last_run_at), { addSuffix: true })}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Last refresh */}
      <p className="text-center text-xs text-gray-400 dark:text-gray-600">
        Last refreshed {formatDistanceToNow(lastRefresh, { addSuffix: true })} · Auto-updates via Supabase Realtime
      </p>
    </div>
  );
}
