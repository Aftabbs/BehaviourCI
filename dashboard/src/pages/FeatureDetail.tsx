import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, GitCommit, GitBranch, Clock, Hash } from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { supabase, type FeatureRow, type RunRow } from '../lib/supabase.ts';
import HealthScore from '../components/HealthScore.tsx';
import StatusBadge from '../components/StatusBadge.tsx';
import TrendChart from '../components/TrendChart.tsx';

export default function FeatureDetail() {
  const { featureName } = useParams<{ featureName: string }>();
  const decodedName = decodeURIComponent(featureName ?? '');

  const [feature, setFeature] = useState<FeatureRow | null>(null);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: feat }, { data: runsData }] = await Promise.all([
        supabase.from('features').select('*').eq('name', decodedName).single(),
        supabase
          .from('runs')
          .select('*')
          .eq('feature_name', decodedName)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      setFeature(feat);
      setRuns(runsData ?? []);
    } catch (err) {
      console.error('Failed to load feature:', err);
    } finally {
      setLoading(false);
    }
  }, [decodedName]);

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`feature-${decodedName}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'runs',
        filter: `feature_name=eq.${decodedName}`,
      }, () => { load(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load, decodedName]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-48" />
        <div className="card p-6 h-48" />
        <div className="card h-64" />
      </div>
    );
  }

  if (!feature) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 dark:text-gray-400">Feature not found</p>
        <Link to="/" className="btn-ghost mt-4">← Back to overview</Link>
      </div>
    );
  }

  const score = feature.latest_score ?? 0;
  const avgScore = runs.length > 0
    ? runs.reduce((s, r) => s + r.overall_score, 0) / runs.length
    : 0;
  const passRate = runs.length > 0
    ? (runs.filter((r) => r.passed).length / runs.length) * 100
    : 0;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Breadcrumb */}
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Overview
      </Link>

      {/* Feature header */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{feature.name}</h1>
            {feature.repo && (
              <p className="text-sm text-gray-400 dark:text-gray-500 font-mono mt-0.5">{feature.repo}</p>
            )}
          </div>
          <HealthScore score={score} size="lg" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          {[
            { label: 'Total Runs', value: feature.run_count.toString() },
            { label: 'Pass Rate', value: `${passRate.toFixed(0)}%` },
            { label: 'Avg Score', value: `${avgScore.toFixed(1)}%` },
            { label: 'Last Run', value: feature.last_run_at ? formatDistanceToNow(parseISO(feature.last_run_at), { addSuffix: true }) : 'Never' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trend chart */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Score over time</h2>
        <TrendChart runs={runs} threshold={85} height={220} />
      </div>

      {/* Run history table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Run history</h2>
        </div>

        {runs.length === 0 ? (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-10">No runs yet</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {runs.map((run) => (
              <Link
                key={run.id}
                to={`/runs/${run.id}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
              >
                <StatusBadge passed={run.passed} size="sm" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {run.overall_score.toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {run.passed_tests}/{run.total_tests} passed
                    </span>
                    {run.branch && (
                      <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 font-mono">
                        <GitBranch className="w-3 h-3" />
                        {run.branch}
                      </span>
                    )}
                    {run.commit_sha && (
                      <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 font-mono">
                        <GitCommit className="w-3 h-3" />
                        {run.commit_sha.slice(0, 7)}
                      </span>
                    )}
                    {run.pr_number && (
                      <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                        <Hash className="w-3 h-3" />
                        PR {run.pr_number}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 shrink-0">
                  <Clock className="w-3 h-3" />
                  {format(parseISO(run.created_at), 'MMM d, HH:mm')}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
