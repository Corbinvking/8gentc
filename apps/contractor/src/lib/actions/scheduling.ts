"use server";

import { db } from "@8gent/db/client";
import { shifts, recurringSchedules, contractorAvailability } from "@8gent/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { requireContractor } from "@/lib/auth";
import { addHours } from "date-fns";

const AUTO_TIMEOUT_HOURS = 2;

export async function createShift(data: { startTime: string; endTime: string; type: "recurring" | "one_off" }) {
  const contractor = await requireContractor();
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);

  const durationMs = end.getTime() - start.getTime();
  if (durationMs < 60 * 60 * 1000) {
    return { error: "Minimum shift duration is 1 hour" };
  }

  const maxAdvance = new Date();
  maxAdvance.setDate(maxAdvance.getDate() + 7);
  if (start > maxAdvance) {
    return { error: "Cannot book shifts more than 7 days in advance" };
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

  await db
    .update(shifts)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(shifts.id, shiftId), eq(shifts.contractorId, contractor.id)));

  return { success: true };
}

export async function getMyShifts() {
  const contractor = await requireContractor();

  return db
    .select()
    .from(shifts)
    .where(and(eq(shifts.contractorId, contractor.id), gte(shifts.startTime, new Date())))
    .orderBy(shifts.startTime);
}

export async function saveRecurringSchedule(
  schedules: Array<{ dayOfWeek: number; startMinute: number; endMinute: number; timezone: string }>
) {
  const contractor = await requireContractor();

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

  return { success: true };
}

export async function goOffline() {
  const contractor = await requireContractor();

  await db
    .update(contractorAvailability)
    .set({ isOnline: false, autoTimeoutAt: null, updatedAt: new Date() })
    .where(eq(contractorAvailability.contractorId, contractor.id));

  return { success: true };
}

export async function getAvailabilityStatus() {
  const contractor = await requireContractor();

  const [status] = await db
    .select()
    .from(contractorAvailability)
    .where(eq(contractorAvailability.contractorId, contractor.id))
    .limit(1);

  return status ?? { contractorId: contractor.id, isOnline: false, lastActiveAt: new Date(), updatedAt: new Date() };
}
