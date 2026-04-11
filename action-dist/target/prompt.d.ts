import type { PromptTarget } from '../types/spec.js';
/**
 * Call an LLM directly using the prompt mode target config.
 * Uses the provider abstraction so it works with Groq, OpenAI, or Anthropic.
 */
export declare function callPrompt(config: PromptTarget, input: string): Promise<string>;
//# sourceMappingURL=prompt.d.ts.map