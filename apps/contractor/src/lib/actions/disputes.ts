"use server";

import { db } from "@8gent/db/client";
import { payoutDisputes } from "@8gent/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { requireContractor } from "@/lib/auth";

export async function submitDispute(data: {
  payoutId?: string;
  taskId?: string;
  reason: string;
}) {
  const contractor = await requireContractor();

  const disputeId = nanoid();
  await db.insert(payoutDisputes).values({
    id: disputeId,
    contractorId: contractor.id,
    payoutId: data.payoutId ?? null,
    taskId: data.taskId ?? null,
    reason: data.reason,
    status: "open",
    createdAt: new Date(),
  });

  return { success: true, disputeId };
}

export async function getMyDisputes() {
  const contractor = await requireContractor();

  return db
    .select()
    .from(payoutDisputes)
    .where(eq(payoutDisputes.contractorId, contractor.id))
    .orderBy(desc(payoutDisputes.createdAt));
}
