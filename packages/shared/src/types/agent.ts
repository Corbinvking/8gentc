export interface Agent {
  id: string;
  name: string;
  ownerId: string;
  status: AgentStatus;
  skills: string[];
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type AgentStatus = "idle" | "running" | "paused" | "error" | "terminated";
