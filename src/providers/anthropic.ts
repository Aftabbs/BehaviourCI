import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, Message, CompletionOptions, CompletionResult } from '../types/providers.js';

export class AnthropicProvider implements LLMProvider {
  name = 'anthropic';
  defaultModel = 'claude-haiku-4-5-20251001';

  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async complete(messages: Message[], options: CompletionOptions = {}): Promise<CompletionResult> {
    const model = options.model ?? this.defaultModel;

    // Anthropic separates system from user/assistant messages
    const systemMsg = messages.find((m) => m.role === 'system');
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const response = await this.client.messages.create({
      model,
      system: systemMsg?.content,
      messages: chatMessages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.max_tokens ?? 2048,
    });

    const block = response.content[0];
    if (!block || block.type !== 'text') {
      throw new Error('Anthropic returned an empty or non-text response');
    }

    return {
      content: block.text,
      model: response.model,
      usage: {
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens,
        total_tokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }
}
