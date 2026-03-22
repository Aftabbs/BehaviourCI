import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, GitCommit, GitBranch, Hash, Clock, Zap, Brain } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase, type RunRow, type TestResultRow } from '../lib/supabase.ts';
import HealthScore from '../components/HealthScore.tsx';
import StatusBadge from '../components/StatusBadge.tsx';
import TestResultRowComponent from '../components/TestResultRow.tsx';

interface BehaviorGroup {
  name: string;
  results: TestResultRow[];
  passed: boolean;
  passRate: number;
}

function groupByBehavior(results: TestResultRow[]): BehaviorGroup[] {
  const map = new Map<string, TestResultRow[]>();
  for (const r of results) {
    if (!map.has(r.behavior_name)) map.set(r.behavior_name, []);
    map.get(r.behavior_name)!.push(r);
  }

  return Array.from(map.entries()).map(([name, rows]) => {
    const passed = rows.filter((r) => r.passed).length;
    return {
      name,
      results: rows,
      passed: passed === rows.length,
      passRate: rows.length > 0 ? (passed / rows.length) * 100 : 0,
    };
  });
}

export default function RunDetail() {
  const { runId } = useParams<{ runId: string }>();
  const [run, setRun] = useState<RunRow | null>(null);
  const [results, setResults] = useState<TestResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'failed'>('all');

  const load = useCallback(async () => {
    if (!runId) return;
    setLoading(true);
    try {
      const [{ data: runData }, { data: resultsData }] = await Promise.all([
        supabase.from('runs').select('*').eq('id', runId).single(),
        supabase
          .from('test_results')
          .select('*')
          .eq('run_id', runId)
          .order('behavior_name'),
      ]);

      setRun(runData);
      setResults(resultsData ?? []);
    } catch (err) {
      console.error('Failed to load run:', err);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-32" />
        <div className="card p-6 h-40" />
        <div className="card h-96" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 dark:text-gray-400">Run not found</p>
        <Link to="/" className="btn-ghost mt-4">← Back to overview</Link>
      </div>
    );
  }

  const behaviors = groupByBehavior(results);
  const filteredBehaviors = filter === 'failed'
    ? behaviors.map((b) => ({ ...b, results: b.results.filter((r) => !r.passed) })).filter((b) => b.results.length > 0)
    : behaviors;

  const ruleCount = results.filter((r) => r.check_type === 'rule').length;
  const semanticCount = results.filter((r) => r.check_type === 'semantic').length;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
        <Link to="/" className="hover:text-gray-900 dark:hover:text-white transition-colors">Overview</Link>
        <span>/</span>
        <Link
          to={`/features/${encodeURIComponent(run.feature_name)}`}
          className="hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          {run.feature_name}
        </Link>
        <span>/</span>
        <span className="font-mono">{run.id.slice(0, 8)}</span>
      </div>

      {/* Run summary card */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge passed={run.passed} />
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">{run.feature_name}</h1>
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500 font-mono">
              {format(parseISO(run.created_at), 'MMMM d, yyyy · HH:mm:ss')}
            </p>
          </div>
          <HealthScore score={run.overall_score} size="lg" />
        </div>

        {/* Meta tags */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          {run.branch && (
            <span className="flex items-center gap-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full px-3 py-1 font-mono">
              <GitBranch className="w-3 h-3" />
              {run.branch}
            </span>
          )}
          {run.commit_sha && (
            <span className="flex items-center gap-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full px-3 py-1 font-mono">
              <GitCommit className="w-3 h-3" />
              {run.commit_sha.slice(0, 8)}
            </span>
          )}
          {run.pr_number && (
            <span className="flex items-center gap-1.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full px-3 py-1">
              <Hash className="w-3 h-3" />
              PR #{run.pr_number}
            </span>
          )}
          {run.repo && (
            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full px-3 py-1 font-mono">
              {run.repo}
            </span>
          )}
          {run.duration_ms && (
            <span className="flex items-center gap-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500 rounded-full px-3 py-1">
              <Clock className="w-3 h-3" />
              {(run.duration_ms / 1000).toFixed(1)}s
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          {[
            { label: 'Tests passed', value: `${run.passed_tests}/${run.total_tests}` },
            { label: 'Threshold', value: `${run.threshold}%` },
            { label: 'Rule checks', value: ruleCount, icon: Zap },
            { label: 'Semantic checks', value: semanticCount, icon: Brain },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                {Icon && <Icon className="w-3 h-3 text-gray-400 dark:text-gray-500" />}
                <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
              </div>
              <p className="text-base font-semibold text-gray-900 dark:text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Test results */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Test Results
            <span className="ml-2 text-gray-400 dark:text-gray-500 font-normal">({results.length} total)</span>
          </h2>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {(['all', 'failed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  filter === f
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {f === 'all' ? 'All' : 'Failed only'}
              </button>
            ))}
          </div>
        </div>

        {filteredBehaviors.length === 0 ? (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-10">
            {filter === 'failed' ? 'No failed tests — all passed!' : 'No test results'}
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredBehaviors.map((behavior) => (
              <div key={behavior.name}>
                {/* Behavior group header */}
                <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50/80 dark:bg-gray-800/30">
                  <StatusBadge passed={behavior.passed} size="sm" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{behavior.name}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                    {behavior.results.filter((r) => r.passed).length}/{behavior.results.length} passed · {behavior.passRate.toFixed(0)}%
                  </span>
                </div>

                {/* Individual test results */}
                {behavior.results.map((result) => (
                  <TestResultRowComponent key={result.id} result={result} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
