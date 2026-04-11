import type { BehaviorSpec, RunReport } from '../types/spec.js';
export interface EvaluatorOptions {
    /** Override threshold from spec */
    threshold?: number;
    /** GitHub context for the run report */
    github?: {
        commitSha?: string;
        branch?: string;
        prNumber?: number;
        repo?: string;
    };
    /** Called after each test case is evaluated (for progress reporting) */
    onProgress?: (done: number, total: number, behaviorName: string) => void;
}
/**
 * Run the full BehaviorCI evaluation for a spec.
 * This is the core orchestrator — called by both the CLI and GitHub Action.
 */
export declare function evaluate(spec: BehaviorSpec, options?: EvaluatorOptions): Promise<RunReport>;
//# sourceMappingURL=index.d.ts.map