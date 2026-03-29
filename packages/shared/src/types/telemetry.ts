export interface TelemetryEvent {
  id: string;
  type: TelemetryEventType;
  agentId?: string;
  userId?: string;
  contractorId?: string;
  taskId?: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

export type TelemetryEventType =
  | "agent.started"
  | "agent.stopped"
  | "agent.error"
  | "task.created"
  | "task.completed"
  | "task.failed"
  | "llm.call"
  | "llm.cache_hit"
  | "dispatch.matched"
  | "billing.charged"
  | "prompt.captured"
  | "session.started"
  | "session.paused"
  | "session.resumed"
  | "session.submitted"
  | "harness.loaded";

export interface PerformanceScore {
  contractorId: string;
  taskId?: string;
  tokenEfficiency: number;
  promptQuality: number;
  outputQuality: number;
  speed: number;
  composite: number;
  calculatedAt: Date;
}

export interface PromptCapture {
  id: string;
  contractorId: string;
  taskId: string;
  harnessType: string;
  promptText: string;
  tokenCount: number;
  timestamp: Date;
}

export interface LlmCallCapture {
  id: string;
  contractorId: string;
  taskId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  cost: number;
  timestamp: Date;
}

export interface SessionCapture {
  id: string;
  contractorId: string;
  taskId: string;
  event: "start" | "pause" | "resume" | "submit";
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
