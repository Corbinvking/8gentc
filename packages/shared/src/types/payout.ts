export interface PayoutRecord {
  id: string;
  contractorId: string;
  amount: number;
  baseAmount: number;
  performanceMultiplier: number;
  efficiencyBonus: number;
  status: PayoutStatus;
  stripePayoutId?: string;
  periodStart: Date;
  periodEnd: Date;
  processedAt?: Date;
  createdAt: Date;
}

export type PayoutStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "disputed";

export interface PayoutDispute {
  id: string;
  contractorId: string;
  payoutId?: string;
  taskId?: string;
  reason: string;
  status: DisputeStatus;
  resolution?: string;
  adminNotes?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

export type DisputeStatus = "open" | "under_review" | "resolved" | "rejected" | "escalated";

export interface EarningsSummary {
  currentPeriodEarnings: number;
  pendingPayouts: number;
  totalEarnings: number;
  projectedEarnings: number;
  tasksCompletedThisPeriod: number;
  averagePerTask: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface PayoutLineItem {
  taskId: string;
  taskTitle: string;
  baseRate: number;
  performanceMultiplier: number;
  efficiencyBonus: number;
  total: number;
  completedAt: Date;
}
