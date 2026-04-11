import type { RunReport } from '../types/spec.js';
/**
 * Persist a RunReport to Supabase.
 * Silently skips if SUPABASE_URL / SUPABASE_ANON_KEY are not set.
 * Returns the run ID if saved, null otherwise.
 */
export declare function saveReport(report: RunReport): Promise<string | null>;
//# sourceMappingURL=supabase.d.ts.map