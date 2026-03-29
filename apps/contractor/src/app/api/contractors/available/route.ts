import { NextResponse } from "next/server";
import { db } from "@8gent/db/client";
import { contractors, contractorAvailability, taskOffers } from "@8gent/db/schema";
import { eq, and, count } from "drizzle-orm";

export async function GET() {
  const available = await db
    .select({
      id: contractors.id,
      displayName: contractors.displayName,
      skills: contractors.skills,
      tier: contractors.tier,
      compositeScore: contractors.compositeScore,
      isOnline: contractorAvailability.isOnline,
    })
    .from(contractors)
    .innerJoin(contractorAvailability, eq(contractors.id, contractorAvailability.contractorId))
    .where(and(eq(contractors.status, "active"), eq(contractorAvailability.isOnline, true)));

  const result = await Promise.all(
    available.map(async (c) => {
      const [taskCount] = await db
        .select({ value: count() })
        .from(taskOffers)
        .where(and(eq(taskOffers.contractorId, c.id), eq(taskOffers.status, "accepted")));

      return {
        id: c.id,
        displayName: c.displayName,
        skills: c.skills,
        tier: c.tier,
        compositeScore: Number(c.compositeScore ?? 0),
        currentTaskCount: taskCount?.value ?? 0,
        isOnline: c.isOnline,
      };
    })
  );

  return NextResponse.json(result);
}
