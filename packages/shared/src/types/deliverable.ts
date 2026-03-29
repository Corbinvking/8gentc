export interface Deliverable {
  id: string;
  taskId: string;
  workstreamId?: string;
  contractorId: string;
  content: string;
  status: DeliverableStatus;
  submittedAt: Date;
  reviewedAt?: Date;
}

export type DeliverableStatus =
  | "submitted"
  | "under_review"
  | "accepted"
  | "revision_requested"
  | "rejected";
