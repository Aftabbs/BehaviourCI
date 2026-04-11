import type { Behavior, TestGeneration } from '../types/spec.js';
import type { GeneratedTestCase } from '../types/spec.js';
/**
 * Generate adversarial test cases for a single behavior using Groq 70B.
 */
export declare function generateTestCases(behavior: Behavior, specName: string, testGenConfig?: TestGeneration): Promise<GeneratedTestCase[]>;
//# sourceMappingURL=index.d.ts.map