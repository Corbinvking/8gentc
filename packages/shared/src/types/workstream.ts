export interface Workstream {
  id: string;
  taskId: string;
  title: string;
  description?: string;
  domain: WorkstreamDomain;
  complexityTier: number;
  estimatedTokens?: number;
  estimatedDurationMinutes?: number;
  dependencies: string[];
  successCriteria: string[];
  status: WorkstreamStatus;
  assignedContractorId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkstreamDomain =
  | "development"
  | "content"
  | "research"
  | "consulting"
  | "design"
  | "mixed";

export type WorkstreamStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "review"
  | "completed"
  | "failed";
