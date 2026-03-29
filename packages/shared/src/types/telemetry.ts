export interface TelemetryEvent {
  id: string;
  type: TelemetryEventType;
  agentId?: string;
  userId?: string;
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
  | "billing.charged";
