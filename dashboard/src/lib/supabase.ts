import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[BehaviorCI Dashboard] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. ' +
    'Create a .env file in the dashboard/ directory with these values.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey || 'placeholder'
);

// ── Database row types (mirrors Supabase schema) ──────────────────────────────

export interface FeatureRow {
  id: string;
  name: string;
  repo: string | null;
  latest_score: number | null;
  run_count: number;
  last_run_at: string | null;
  created_at: string;
}

export interface RunRow {
  id: string;
  feature_name: string;
  commit_sha: string | null;
  branch: string | null;
  pr_number: number | null;
  repo: string | null;
  overall_score: number;
  passed: boolean;
  total_tests: number;
  passed_tests: number;
  threshold: number;
  duration_ms: number | null;
  created_at: string;
}

export interface TestResultRow {
  id: string;
  run_id: string;
  behavior_name: string;
  test_input: string | null;
  actual_output: string | null;
  passed: boolean;
  score: number | null;
  check_type: string | null;
  failure_reason: string | null;
  judge_reasoning: string | null;
  duration_ms: number | null;
  created_at: string;
}
