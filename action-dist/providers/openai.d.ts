import type { LLMProvider, Message, CompletionOptions, CompletionResult } from '../types/providers.js';
export declare class OpenAIProvider implements LLMProvider {
    name: string;
    defaultModel: string;
    private client;
    constructor(apiKey: string);
    complete(messages: Message[], options?: CompletionOptions): Promise<CompletionResult>;
}
//# sourceMappingURL=openai.d.ts.map