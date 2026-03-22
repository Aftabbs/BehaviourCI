import { AzureOpenAI } from 'openai';
import type { LLMProvider, Message, CompletionOptions, CompletionResult } from '../types/providers.js';

/**
 * Azure OpenAI provider.
 * Reads config from environment variables:
 *   AZURE_OPENAI_API_KEY       — your Azure OpenAI key
 *   AZURE_OPENAI_ENDPOINT      — e.g. https://yourname.openai.azure.com/
 *   AZURE_OPENAI_DEPLOYMENT    — deployment name, e.g. gpt-4o
 *   AZURE_OPENAI_API_VERSION   — e.g. 2025-01-01-preview
 */
export class AzureOpenAIProvider implements LLMProvider {
  name = 'azure-openai';
  defaultModel: string;

  private client: AzureOpenAI;
  private deployment: string;

  constructor() {
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? '2025-01-01-preview';

    if (!apiKey) throw new Error('AZURE_OPENAI_API_KEY is not set.');
    if (!endpoint) throw new Error('AZURE_OPENAI_ENDPOINT is not set.');
    if (!deployment) throw new Error('AZURE_OPENAI_DEPLOYMENT is not set.');

    this.deployment = deployment;
    this.defaultModel = process.env.AZURE_OPENAI_MODEL ?? deployment;

    this.client = new AzureOpenAI({ apiKey, endpoint, apiVersion });
  }

  async complete(messages: Message[], options: CompletionOptions = {}): Promise<CompletionResult> {
    // Azure uses the deployment name instead of the model name
    const response = await this.client.chat.completions.create({
      model: this.deployment,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? 0.3,
      max_tokens: options.max_tokens ?? 2048,
      response_format: options.json_mode ? { type: 'json_object' } : { type: 'text' },
    });

    const choice = response.choices[0];
    if (!choice?.message?.content) {
      throw new Error('Azure OpenAI returned an empty response');
    }

    return {
      content: choice.message.content,
      model: response.model ?? this.deployment,
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
