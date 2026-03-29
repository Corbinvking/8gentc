"use server";

import { db } from "@8gent/db/client";
import { payoutDisputes, taskOffers, deliverables } from "@8gent/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { requireContractor } from "@/lib/auth";

export async function submitDispute(data: {
  payoutId?: string;
  taskId?: string;
  reason: string;
}) {
  const contractor = await requireContractor();

  let metadata: Record<string, unknown> = {};

  if (data.taskId) {
    const [offer] = await db
      .select()
      .from(taskOffers)
      .where(
        and(
          eq(taskOffers.taskId, data.taskId),
          eq(taskOffers.contractorId, contractor.id)
        )
      )
      .limit(1);

    const taskDeliverables = await db
      .select()
      .from(deliverables)
      .where(
        and(
          eq(deliverables.taskId, data.taskId),
          eq(deliverables.contractorId, contractor.id)
        )
      )
      .orderBy(desc(deliverables.submittedAt));

    metadata = {
      taskOfferId: offer?.id ?? null,
      taskStatus: offer?.status ?? null,
      offeredAt: offer?.offeredAt ?? null,
      deliverableCount: taskDeliverables.length,
      lastDeliverableStatus: taskDeliverables[0]?.status ?? null,
      contractorTier: contractor.tier,
      contractorCompositeScore: contractor.compositeScore,
    };
  }

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

  return { success: true, disputeId, metadata };
}

export async function getMyDisputes() {
  const contractor = await requireContractor();

  return db
    .select({
      id: payoutDisputes.id,
      contractorId: payoutDisputes.contractorId,
      payoutId: payoutDisputes.payoutId,
      taskId: payoutDisputes.taskId,
      reason: payoutDisputes.reason,
      status: payoutDisputes.status,
      resolution: payoutDisputes.resolution,
      adminNotes: payoutDisputes.adminNotes,
      createdAt: payoutDisputes.createdAt,
      resolvedAt: payoutDisputes.resolvedAt,
    })
    .from(payoutDisputes)
    .where(eq(payoutDisputes.contractorId, contractor.id))
    .orderBy(desc(payoutDisputes.createdAt));
}
