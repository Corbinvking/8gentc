import { NextResponse } from "next/server";
import { db } from "@8gent/db/client";
import { shifts, contractorAvailability } from "@8gent/db/schema";
import { gte, eq, and } from "drizzle-orm";

export async function GET() {
  const now = new Date();

  const upcomingShifts = await db
    .select()
    .from(shifts)
    .where(and(gte(shifts.startTime, now), eq(shifts.status, "scheduled")));

  const onlineStatuses = await db
    .select()
    .from(contractorAvailability)
    .where(eq(contractorAvailability.isOnline, true));

  const onlineSet = new Set(onlineStatuses.map((s) => s.contractorId));

  const schedule = upcomingShifts.map((shift) => ({
    contractorId: shift.contractorId,
    startTime: shift.startTime.toISOString(),
    endTime: shift.endTime.toISOString(),
    isOnline: onlineSet.has(shift.contractorId),
  }));

  return NextResponse.json(schedule);
}
