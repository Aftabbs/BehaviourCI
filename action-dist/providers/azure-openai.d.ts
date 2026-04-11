import type { LLMProvider, Message, CompletionOptions, CompletionResult } from '../types/providers.js';
/**
 * Azure OpenAI provider.
 * Reads config from environment variables:
 *   AZURE_OPENAI_API_KEY       — your Azure OpenAI key
 *   AZURE_OPENAI_ENDPOINT      — e.g. https://yourname.openai.azure.com/
 *   AZURE_OPENAI_DEPLOYMENT    — deployment name, e.g. gpt-4o
 *   AZURE_OPENAI_API_VERSION   — e.g. 2025-01-01-preview
 */
export declare class AzureOpenAIProvider implements LLMProvider {
    name: string;
    defaultModel: string;
    private client;
    private deployment;
    constructor();
    complete(messages: Message[], options?: CompletionOptions): Promise<CompletionResult>;
}
//# sourceMappingURL=azure-openai.d.ts.map