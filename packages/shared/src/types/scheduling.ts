export interface Shift {
  id: string;
  contractorId: string;
  startTime: Date;
  endTime: Date;
  type: ShiftType;
  status: ShiftStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ShiftType = "recurring" | "one_off";
export type ShiftStatus = "scheduled" | "active" | "completed" | "cancelled";

export interface RecurringSchedule {
  id: string;
  contractorId: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  timezone: string;
  isActive: boolean;
}

export interface ContractorAvailability {
  contractorId: string;
  isOnline: boolean;
  lastActiveAt: Date;
  autoTimeoutAt?: Date;
  currentShiftId?: string;
}

export interface AvailabilitySlot {
  startTime: Date;
  endTime: Date;
  contractorCount: number;
  isFull: boolean;
}
