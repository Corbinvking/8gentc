import type { LLMProvider } from "../constants/index.js";

export interface LLMCallRecord {
  id: string;
  userId: string;
  agentId?: string;
  taskId?: string;
  provider: LLMProvider;
  model: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  latencyMs: number;
  cacheHit: boolean;
  taskType?: string;
  timestamp: Date;
}

export interface LLMCompletionRequest {
  prompt: string;
  context?: string;
  taskType?: string;
  priority?: "low" | "normal" | "high";
  userId: string;
  agentId?: string;
  budgetRemaining?: number;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMCompletionResponse {
  response: string;
  modelUsed: string;
  provider: LLMProvider;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latencyMs: number;
  cacheHit: boolean;
}
