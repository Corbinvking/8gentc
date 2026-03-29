export interface UnderstandingItem {
  id: string;
  userId: string;
  type: UnderstandingItemType;
  priority: UnderstandingPriority;
  relevantNotes: string[];
  suggestedAction: string;
  expiresAt?: Date;
  status: UnderstandingItemStatus;
  feedback?: UnderstandingFeedback;
  createdAt: Date;
}

export type UnderstandingItemType =
  | "question"
  | "suggestion"
  | "alert"
  | "idea"
  | "goal_detected"
  | "contradiction";

export type UnderstandingPriority = "low" | "medium" | "high" | "urgent";

export type UnderstandingItemStatus =
  | "pending"
  | "delivered"
  | "acknowledged"
  | "dismissed"
  | "actioned";

export type UnderstandingFeedback = "helpful" | "not_helpful" | "dismissed";
