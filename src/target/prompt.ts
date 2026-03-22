import { getProvider } from '../providers/index.js';
import type { PromptTarget } from '../types/spec.js';

/** Substitute {{input}} in a template string */
function interpolate(template: string, input: string): string {
  return template.replace(/\{\{input\}\}/g, input);
}

/**
 * Call an LLM directly using the prompt mode target config.
 * Uses the provider abstraction so it works with Groq, OpenAI, or Anthropic.
 */
export async function callPrompt(config: PromptTarget, input: string): Promise<string> {
  const provider = getProvider(config.provider);

  const userContent = interpolate(config.template, input);

  const messages = [
    ...(config.system ? [{ role: 'system' as const, content: config.system }] : []),
    { role: 'user' as const, content: userContent },
  ];

  const result = await provider.complete(messages, {
    model: config.model,
    temperature: config.temperature ?? 0.3,
    max_tokens: config.max_tokens ?? 1024,
  });

  return result.content;
}
