import Groq from 'groq-sdk';
import type { LLMProvider, Message, CompletionOptions, CompletionResult } from '../types/providers.js';

const MAX_RETRIES = 4;

/** Wait for `ms` milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Extract retry-after seconds from a Groq 429 error message */
function parseRetryAfter(errorMessage: string): number {
  const match = errorMessage.match(/try again in (\d+(?:\.\d+)?)s/i);
  if (match) return Math.ceil(parseFloat(match[1])) * 1000;
  return 5000; // default 5s backoff
}

export class GroqProvider implements LLMProvider {
  name = 'groq';
  defaultModel = 'llama-3.3-70b-versatile';

  private client: Groq;

  constructor(apiKey: string) {
    this.client = new Groq({ apiKey });
  }

  async complete(messages: Message[], options: CompletionOptions = {}): Promise<CompletionResult> {
    const model = options.model ?? this.defaultModel;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await this.client.chat.completions.create({
          model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          temperature: options.temperature ?? 0.3,
          max_tokens: options.max_tokens ?? 2048,
          response_format: options.json_mode ? { type: 'json_object' } : { type: 'text' },
        });

        const choice = response.choices[0];
        if (!choice?.message?.content) {
          throw new Error('Groq returned an empty response');
        }

        return {
          content: choice.message.content,
          model: response.model,
          usage: response.usage
            ? {
                prompt_tokens: response.usage.prompt_tokens,
                completion_tokens: response.usage.completion_tokens,
                total_tokens: response.usage.total_tokens,
              }
            : undefined,
        };
      } catch (err: unknown) {
        const isRateLimit =
          err instanceof Error &&
          (err.message.includes('429') || err.message.toLowerCase().includes('rate limit'));

        const isLastAttempt = attempt === MAX_RETRIES - 1;

        if (isRateLimit && !isLastAttempt) {
          const waitMs = parseRetryAfter(err instanceof Error ? err.message : '') +
            attempt * 2000; // extra backoff per attempt
          process.stderr.write(
            `\r  [groq] Rate limited — waiting ${(waitMs / 1000).toFixed(0)}s before retry ${attempt + 1}/${MAX_RETRIES - 1}...`
          );
          await sleep(waitMs);
          continue;
        }

        throw err;
      }
    }

    // Should never reach here
    throw new Error('Groq: exceeded max retries');
  }
}
