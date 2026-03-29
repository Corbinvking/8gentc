"use server";

import { db } from "@8gent/db/client";
import { taskOffers, deliverables } from "@8gent/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { requireContractor } from "@/lib/auth";
import { platformCClient } from "@8gent/api-client/platform-c";

export async function getAvailableTasks(filters?: {
  category?: string;
  complexity?: number;
  sortBy?: "payout" | "deadline" | "match_score";
}) {
  const contractor = await requireContractor();

  try {
    const tasks = await platformCClient.getAvailableTasks(contractor.id, filters);
    return { tasks };
  } catch {
    const localOffers = await db
      .select()
      .from(taskOffers)
      .where(and(eq(taskOffers.contractorId, contractor.id), eq(taskOffers.status, "pending")))
      .orderBy(desc(taskOffers.offeredAt));
    return { tasks: localOffers };
  }
}

export async function acceptTask(offerId: string) {
  const contractor = await requireContractor();

  const [offer] = await db
    .select()
    .from(taskOffers)
    .where(and(eq(taskOffers.id, offerId), eq(taskOffers.contractorId, contractor.id)))
    .limit(1);

  if (!offer) return { error: "Task offer not found" };
  if (offer.status !== "pending") return { error: "Task offer already responded to" };
  if (new Date() > offer.expiresAt) return { error: "Task offer has expired" };

  try {
    await platformCClient.acceptTask(offer.taskId, contractor.id);
  } catch {
    // Platform C may not be available -- proceed with local state
  }

  await db
    .update(taskOffers)
    .set({ status: "accepted", respondedAt: new Date() })
    .where(eq(taskOffers.id, offerId));

  return { success: true };
}

export async function rejectTask(offerId: string, reason?: string) {
  const contractor = await requireContractor();

  const [offer] = await db
    .select()
    .from(taskOffers)
    .where(and(eq(taskOffers.id, offerId), eq(taskOffers.contractorId, contractor.id)))
    .limit(1);

  if (!offer) return { error: "Task offer not found" };

  try {
    await platformCClient.rejectTask(offer.taskId, contractor.id, reason);
  } catch {
    // proceed with local state
  }

  await db
    .update(taskOffers)
    .set({ status: "rejected", respondedAt: new Date(), rejectionReason: reason ?? null })
    .where(eq(taskOffers.id, offerId));

  return { success: true };
}

export async function getActiveTasks() {
  const contractor = await requireContractor();

  return db
    .select()
    .from(taskOffers)
    .where(and(eq(taskOffers.contractorId, contractor.id), eq(taskOffers.status, "accepted")))
    .orderBy(desc(taskOffers.offeredAt));
}

export async function submitDeliverable(taskId: string, content: string, fileUrls: string[]) {
  const contractor = await requireContractor();

  const deliverableId = nanoid();
  await db.insert(deliverables).values({
    id: deliverableId,
    taskId,
    contractorId: contractor.id,
    content,
    fileUrls,
    status: "submitted",
    submittedAt: new Date(),
  });

  try {
    await platformCClient.submitDeliverable(taskId, {
      contractorId: contractor.id,
      content,
      fileUrls,
    });
  } catch {
    // proceed locally
  }

  return { success: true, deliverableId };
}

export async function submitRevision(taskId: string, content: string, fileUrls: string[], originalDeliverableId: string) {
  const contractor = await requireContractor();

  const [original] = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.id, originalDeliverableId))
    .limit(1);

  const revisionNumber = (original?.revisionNumber ?? 0) + 1;
  if (revisionNumber > 2) {
    return { error: "Maximum 2 revisions allowed. Task will be escalated." };
  }

  const deliverableId = nanoid();
  await db.insert(deliverables).values({
    id: deliverableId,
    taskId,
    contractorId: contractor.id,
    content,
    fileUrls,
    revisionOf: originalDeliverableId,
    revisionNumber,
    status: "submitted",
    submittedAt: new Date(),
  });

  try {
    await platformCClient.submitRevision(taskId, {
      contractorId: contractor.id,
      content,
      fileUrls,
      revisionOf: originalDeliverableId,
    });
  } catch {
    // proceed locally
  }

  return { success: true, deliverableId };
}
