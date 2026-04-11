import type { LLMProvider, ProviderName } from '../types/providers.js';
import { GroqProvider } from './groq.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { AzureOpenAIProvider } from './azure-openai.js';
/**
 * Returns an LLMProvider instance based on the requested name and available API keys.
 * Groq is the primary provider — falls back to others if key is not set.
 */
export declare function getProvider(name?: ProviderName): LLMProvider;
/** Returns the primary available provider based on which API keys are set. Groq first. */
export declare function getPrimaryProvider(): LLMProvider;
export { GroqProvider, OpenAIProvider, AnthropicProvider, AzureOpenAIProvider };
export type { LLMProvider };
//# sourceMappingURL=index.d.ts.map