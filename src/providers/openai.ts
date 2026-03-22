import OpenAI from 'openai';
import type { LLMProvider, Message, CompletionOptions, CompletionResult } from '../types/providers.js';

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  defaultModel = 'gpt-4o-mini';

  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async complete(messages: Message[], options: CompletionOptions = {}): Promise<CompletionResult> {
    const model = options.model ?? this.defaultModel;

    const response = await this.client.chat.completions.create({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? 0.3,
      max_tokens: options.max_tokens ?? 2048,
      response_format: options.json_mode ? { type: 'json_object' } : { type: 'text' },
    });

    const choice = response.choices[0];
    if (!choice?.message?.content) {
      throw new Error('OpenAI returned an empty response');
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
  }
}
