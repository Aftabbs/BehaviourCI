import type { LLMProvider, ProviderName } from '../types/providers.js';
import { GroqProvider } from './groq.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { AzureOpenAIProvider } from './azure-openai.js';

/**
 * Returns an LLMProvider instance based on the requested name and available API keys.
 * Groq is the primary provider — falls back to others if key is not set.
 */
export function getProvider(name: ProviderName = 'groq'): LLMProvider {
  if (name === 'groq') {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error('GROQ_API_KEY is not set. Add it to your environment or .env file.');
    return new GroqProvider(key);
  }

  if (name === 'openai') {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY is not set.');
    return new OpenAIProvider(key);
  }

  if (name === 'anthropic') {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY is not set.');
    return new AnthropicProvider(key);
  }

  if (name === 'azure-openai') {
    // AzureOpenAIProvider reads all config from env vars directly
    return new AzureOpenAIProvider();
  }

  throw new Error(`Unknown provider: ${name}`);
}

/** Returns the primary available provider based on which API keys are set. Groq first. */
export function getPrimaryProvider(): LLMProvider {
  if (process.env.GROQ_API_KEY) return getProvider('groq');
  if (process.env.AZURE_OPENAI_API_KEY) return getProvider('azure-openai');
  if (process.env.OPENAI_API_KEY) return getProvider('openai');
  if (process.env.ANTHROPIC_API_KEY) return getProvider('anthropic');
  throw new Error(
    'No LLM provider API key found. Set GROQ_API_KEY (recommended), AZURE_OPENAI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY.'
  );
}

export { GroqProvider, OpenAIProvider, AnthropicProvider, AzureOpenAIProvider };
export type { LLMProvider };
