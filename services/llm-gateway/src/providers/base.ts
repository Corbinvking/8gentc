export interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface LLMResponse {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  finishReason: string;
}

export interface LLMProviderHealth {
  available: boolean;
  latencyMs: number;
  errorRate: number;
  lastError?: string;
  lastChecked: Date;
}

export interface LLMProviderAdapter {
  readonly name: string;
  readonly models: string[];
  complete(request: LLMRequest): Promise<LLMResponse>;
  stream?(request: LLMRequest): AsyncGenerator<string, LLMResponse>;
  healthCheck(): Promise<LLMProviderHealth>;
}

export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
  "claude-3-5-haiku-20241022": { input: 0.8, output: 4.0 },
  "claude-3-opus-20240229": { input: 15.0, output: 75.0 },
  "gpt-4o": { input: 2.5, output: 10.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4.5-preview": { input: 75.0, output: 150.0 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
  "gemini-2.5-pro-preview-05-06": { input: 1.25, output: 10.0 },
};

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const rates = MODEL_COSTS[model];
  if (!rates) return 0;
  return (inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output;
}
