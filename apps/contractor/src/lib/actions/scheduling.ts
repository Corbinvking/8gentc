"use server";

import { db } from "@8gent/db/client";
import { shifts, recurringSchedules, contractorAvailability } from "@8gent/db/schema";
import { eq, and, gte, lte, lt, ne, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { requireContractor } from "@/lib/auth";
import { addHours } from "date-fns";

const AUTO_TIMEOUT_HOURS = 2;
const TIMEOUT_WARNING_MINUTES = 15;

export async function createShift(data: { startTime: string; endTime: string; type: "recurring" | "one_off" }) {
  const contractor = await requireContractor();

  // All times stored in UTC
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { error: "Invalid date format. Provide ISO 8601 timestamps." };
  }

  if (end <= start) {
    return { error: "End time must be after start time" };
  }

  const durationMs = end.getTime() - start.getTime();
  if (durationMs < 60 * 60 * 1000) {
    return { error: "Minimum shift duration is 1 hour" };
  }

  if (start < new Date()) {
    return { error: "Cannot create a shift in the past" };
  }

  const maxAdvance = new Date();
  maxAdvance.setDate(maxAdvance.getDate() + 7);
  if (start > maxAdvance) {
    return { error: "Cannot book shifts more than 7 days in advance" };
  }

  // Overlap check: find any existing non-cancelled shift that overlaps [start, end)
  const overlapping = await db
    .select({ id: shifts.id })
    .from(shifts)
    .where(
      and(
        eq(shifts.contractorId, contractor.id),
        ne(shifts.status, "cancelled"),
        lt(shifts.startTime, end),
        sql`${shifts.endTime} > ${start}`
      )
    )
    .limit(1);

  if (overlapping.length > 0) {
    return { error: "This shift overlaps with an existing shift. Please choose a different time." };
  }

  const shiftId = nanoid();
  await db.insert(shifts).values({
    id: shiftId,
    contractorId: contractor.id,
    startTime: start,
    endTime: end,
    type: data.type,
    status: "scheduled",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return { success: true, shiftId };
}

export async function cancelShift(shiftId: string) {
  const contractor = await requireContractor();

  const [shift] = await db
    .select()
    .from(shifts)
    .where(and(eq(shifts.id, shiftId), eq(shifts.contractorId, contractor.id)))
    .limit(1);

  if (!shift) return { error: "Shift not found" };
  if (shift.status === "cancelled") return { error: "Shift is already cancelled" };

  await db
    .update(shifts)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(shifts.id, shiftId));

  return { success: true };
}

export async function getMyShifts() {
  const contractor = await requireContractor();

  return db
    .select()
    .from(shifts)
    .where(
      and(
        eq(shifts.contractorId, contractor.id),
        ne(shifts.status, "cancelled"),
        gte(shifts.endTime, new Date())
      )
    )
    .orderBy(shifts.startTime);
}

export async function saveRecurringSchedule(
  schedules: Array<{ dayOfWeek: number; startMinute: number; endMinute: number; timezone: string }>
) {
  const contractor = await requireContractor();

  for (const schedule of schedules) {
    if (schedule.dayOfWeek < 0 || schedule.dayOfWeek > 6) {
      return { error: `Invalid dayOfWeek: ${schedule.dayOfWeek}` };
    }
    if (schedule.startMinute < 0 || schedule.startMinute >= 1440 || schedule.endMinute < 0 || schedule.endMinute >= 1440) {
      return { error: "Invalid time: minutes must be 0-1439" };
    }
    if (schedule.startMinute >= schedule.endMinute) {
      return { error: "Start time must be before end time" };
    }
  }

  await db.delete(recurringSchedules).where(eq(recurringSchedules.contractorId, contractor.id));

  for (const schedule of schedules) {
    await db.insert(recurringSchedules).values({
      id: nanoid(),
      contractorId: contractor.id,
      dayOfWeek: schedule.dayOfWeek,
      startMinute: schedule.startMinute,
      endMinute: schedule.endMinute,
      timezone: schedule.timezone,
      isActive: true,
      createdAt: new Date(),
    });
  }

  return { success: true };
}

export async function goOnline() {
  const contractor = await requireContractor();
  const now = new Date();
  const timeoutAt = addHours(now, AUTO_TIMEOUT_HOURS);

  const existing = await db
    .select()
    .from(contractorAvailability)
    .where(eq(contractorAvailability.contractorId, contractor.id))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(contractorAvailability)
      .set({ isOnline: true, lastActiveAt: now, autoTimeoutAt: timeoutAt, updatedAt: now })
      .where(eq(contractorAvailability.contractorId, contractor.id));
  } else {
    await db.insert(contractorAvailability).values({
      contractorId: contractor.id,
      isOnline: true,
      lastActiveAt: now,
      autoTimeoutAt: timeoutAt,
      updatedAt: now,
    });
  }

  return { success: true, timeoutAt: timeoutAt.toISOString() };
}

export async function goOffline() {
  const contractor = await requireContractor();

  await db
    .update(contractorAvailability)
    .set({ isOnline: false, autoTimeoutAt: null, updatedAt: new Date() })
    .where(eq(contractorAvailability.contractorId, contractor.id));

  return { success: true };
}

export async function heartbeat() {
  const contractor = await requireContractor();
  const now = new Date();

  const [status] = await db
    .select()
    .from(contractorAvailability)
    .where(eq(contractorAvailability.contractorId, contractor.id))
    .limit(1);

  if (!status || !status.isOnline) {
    return { isOnline: false };
  }

  if (status.autoTimeoutAt && now > status.autoTimeoutAt) {
    await db
      .update(contractorAvailability)
      .set({ isOnline: false, autoTimeoutAt: null, updatedAt: now })
      .where(eq(contractorAvailability.contractorId, contractor.id));

    return { isOnline: false, timedOut: true };
  }

  const newTimeoutAt = addHours(now, AUTO_TIMEOUT_HOURS);
  await db
    .update(contractorAvailability)
    .set({ lastActiveAt: now, autoTimeoutAt: newTimeoutAt, updatedAt: now })
    .where(eq(contractorAvailability.contractorId, contractor.id));

  const minutesUntilTimeout = Math.floor((newTimeoutAt.getTime() - now.getTime()) / 60000);
  const warningTimeout = minutesUntilTimeout <= TIMEOUT_WARNING_MINUTES;

  return {
    isOnline: true,
    minutesUntilTimeout,
    warningTimeout,
    timeoutAt: newTimeoutAt.toISOString(),
  };
}

export async function getAvailabilityStatus() {
  const contractor = await requireContractor();

  const [status] = await db
    .select()
    .from(contractorAvailability)
    .where(eq(contractorAvailability.contractorId, contractor.id))
    .limit(1);

  if (!status) {
    return {
      contractorId: contractor.id,
      isOnline: false,
      lastActiveAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // Auto-timeout check on status read
  if (status.isOnline && status.autoTimeoutAt && new Date() > status.autoTimeoutAt) {
    await db
      .update(contractorAvailability)
      .set({ isOnline: false, autoTimeoutAt: null, updatedAt: new Date() })
      .where(eq(contractorAvailability.contractorId, contractor.id));

    return { ...status, isOnline: false, timedOut: true };
  }

  return status;
}
