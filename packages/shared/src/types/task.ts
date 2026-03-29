export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedAgentId?: string;
  assignedContractorId?: string;
  createdById: string;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export type TaskStatus = "pending" | "assigned" | "in_progress" | "review" | "completed" | "failed";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
