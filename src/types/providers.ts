// ─── LLM Provider abstraction ────────────────────────────────────────────────

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  /** If true, instruct the provider to return valid JSON */
  json_mode?: boolean;
}

export interface CompletionResult {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** Unified interface all providers must implement */
export interface LLMProvider {
  name: string;
  defaultModel: string;
  complete(messages: Message[], options?: CompletionOptions): Promise<CompletionResult>;
}

export type ProviderName = 'groq' | 'openai' | 'anthropic' | 'azure-openai';
