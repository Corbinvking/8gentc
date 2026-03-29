export interface AgentOutput {
  id: string;
  agentId: string;
  type: AgentOutputType;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export type AgentOutputType =
  | "text"
  | "code"
  | "file"
  | "analysis"
  | "recommendation"
  | "alert";
