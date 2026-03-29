export interface SwarmSession {
  id: string;
  ownerId: string;
  template: string;
  coordinatorAgentId?: string;
  workerAgentIds: string[];
  taskId?: string;
  status: SwarmSessionStatus;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type SwarmSessionStatus =
  | "initializing"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "terminated";
