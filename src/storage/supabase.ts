import { createClient } from '@supabase/supabase-js';
import type { RunReport } from '../types/spec.js';

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null; // Storage is optional — skip silently if not configured
  }

  return createClient(url, key);
}

/**
 * Persist a RunReport to Supabase.
 * Silently skips if SUPABASE_URL / SUPABASE_ANON_KEY are not set.
 * Returns the run ID if saved, null otherwise.
 */
export async function saveReport(report: RunReport): Promise<string | null> {
  const supabase = getClient();
  if (!supabase) return null;

  try {
    // Upsert feature record
    await supabase.from('features').upsert(
      {
        name: report.featureName,
        repo: report.repo ?? null,
        latest_score: report.overallScore,
        run_count: 1,
        last_run_at: report.startedAt,
      },
      {
        onConflict: 'name',
        ignoreDuplicates: false,
      }
    );

    // Increment run_count via RPC (best-effort, ignore failure)
    await supabase.rpc('increment_feature_run_count', { feature_name: report.featureName }).maybeSingle();

    // Insert run record
    const { data: run, error: runError } = await supabase
      .from('runs')
      .insert({
        id: report.id,
        feature_name: report.featureName,
        commit_sha: report.commitSha ?? null,
        branch: report.branch ?? null,
        pr_number: report.prNumber ?? null,
        repo: report.repo ?? null,
        overall_score: report.overallScore,
        passed: report.passed,
        total_tests: report.totalTests,
        passed_tests: report.passedTests,
        threshold: report.threshold,
        duration_ms: report.durationMs,
        created_at: report.startedAt,
      })
      .select('id')
      .single();

    if (runError) {
      console.warn(`[BehaviorCI] Warning: could not save run to Supabase: ${runError.message}`);
      return null;
    }

    // Insert individual test results
    const testResultRows = report.behaviors.flatMap((b) =>
      b.results.map((r) => ({
        run_id: run.id,
        behavior_name: r.behaviorName,
        test_input: r.input,
        actual_output: r.actualOutput,
        passed: r.passed,
        score: r.score,
        check_type: r.checkType,
        failure_reason: r.failureReason ?? null,
        judge_reasoning: r.judgeReasoning ?? null,
        duration_ms: r.durationMs,
      }))
    );

    if (testResultRows.length > 0) {
      const { error: resultsError } = await supabase.from('test_results').insert(testResultRows);
      if (resultsError) {
        console.warn(`[BehaviorCI] Warning: could not save test results: ${resultsError.message}`);
      }
    }

    return run.id as string;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[BehaviorCI] Warning: Supabase storage error: ${msg}`);
    return null;
  }
}
