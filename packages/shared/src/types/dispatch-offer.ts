export interface DispatchOffer {
  id: string;
  workstreamId: string;
  contractorId: string;
  status: DispatchOfferStatus;
  offeredAt: Date;
  respondedAt?: Date;
}

export type DispatchOfferStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "expired"
  | "withdrawn";
