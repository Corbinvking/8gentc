export interface Clarification {
  id: string;
  taskId: string;
  senderType: ClarificationSender;
  senderId: string;
  message: string;
  createdAt: Date;
}

export type ClarificationSender = "client" | "contractor" | "system";
