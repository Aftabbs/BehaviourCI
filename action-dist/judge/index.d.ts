import type { JudgeResult } from '../types/spec.js';
/**
 * Use Groq 70B as an LLM judge to evaluate whether an AI output meets a behavior requirement.
 */
export declare function judgeOutput(params: {
    behaviorName: string;
    behaviorDescription: string;
    input: string;
    output: string;
    expectedDescription: string;
}): Promise<JudgeResult>;
//# sourceMappingURL=index.d.ts.map