export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  category?: TaskCategory;
  complexity?: TaskComplexity;
  harnessType?: HarnessType;
  estimatedDuration?: number;
  payoutMin?: number;
  payoutMax?: number;
  deadline?: Date;
  assignedAgentId?: string;
  assignedContractorId?: string;
  createdById: string;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export type TaskStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "review"
  | "completed"
  | "failed";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskCategory =
  | "development"
  | "content_creation"
  | "research"
  | "consulting"
  | "management"
  | "customer_service";

export type HarnessType =
  | "coding"
  | "content"
  | "research"
  | "consulting"
  | "management"
  | "support";

export type TaskComplexity = 1 | 2 | 3 | 4 | 5;

export interface TaskOffer {
  id: string;
  taskId: string;
  contractorId: string;
  title: string;
  description: string;
  category: TaskCategory;
  complexity: TaskComplexity;
  harnessType: HarnessType;
  estimatedDuration: number;
  payoutMin: number;
  payoutMax: number;
  deadline?: Date;
  clientContextSummary?: string;
  offeredAt: Date;
  expiresAt: Date;
  status: TaskOfferStatus;
}

export type TaskOfferStatus = "pending" | "accepted" | "rejected" | "expired";

export interface TaskClarification {
  id: string;
  taskId: string;
  senderId: string;
  senderRole: "contractor" | "client" | "system";
  message: string;
  createdAt: Date;
}

export interface TaskSubtask {
  id: string;
  parentTaskId: string;
  title: string;
  description: string;
  status: TaskStatus;
  order: number;
}
