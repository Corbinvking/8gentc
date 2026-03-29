export interface Contractor {
  id: string;
  userId: string;
  displayName: string;
  skills: string[];
  rating: number;
  completedTasks: number;
  status: ContractorStatus;
  stripeConnectId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ContractorStatus = "pending" | "active" | "suspended" | "inactive";
