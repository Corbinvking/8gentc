"use server";

import { db } from "@8gent/db/client";
import { taskOffers, deliverables, contractors } from "@8gent/db/schema";
import { eq, and, desc, lt, count, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { requireContractor } from "@/lib/auth";
import { platformCClient } from "@8gent/api-client/platform-c";

async function expireStaleOffers(contractorId: string) {
  const now = new Date();
  await db
    .update(taskOffers)
    .set({ status: "expired", respondedAt: now })
    .where(
      and(
        eq(taskOffers.contractorId, contractorId),
        eq(taskOffers.status, "pending"),
        lt(taskOffers.expiresAt, now)
      )
    );
}

async function updateAcceptanceRate(contractorId: string) {
  const [total] = await db
    .select({ value: count() })
    .from(taskOffers)
    .where(
      and(
        eq(taskOffers.contractorId, contractorId),
        sql`${taskOffers.status} IN ('accepted', 'rejected', 'expired')`
      )
    );

  const [accepted] = await db
    .select({ value: count() })
    .from(taskOffers)
    .where(and(eq(taskOffers.contractorId, contractorId), eq(taskOffers.status, "accepted")));

  const rate =
    (total?.value ?? 0) > 0
      ? ((accepted?.value ?? 0) / (total?.value ?? 1)) * 100
      : 100;

  await db
    .update(contractors)
    .set({ acceptanceRate: String(Math.round(rate * 100) / 100), updatedAt: new Date() })
    .where(eq(contractors.id, contractorId));
}

export async function getAvailableTasks(filters?: {
  category?: string;
  complexity?: number;
  sortBy?: "payout" | "deadline" | "match_score";
}) {
  const contractor = await requireContractor();

  await expireStaleOffers(contractor.id);

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

  if (new Date() > offer.expiresAt) {
    await db
      .update(taskOffers)
      .set({ status: "expired", respondedAt: new Date() })
      .where(eq(taskOffers.id, offerId));
    await updateAcceptanceRate(contractor.id);
    return { error: "Task offer has expired" };
  }

  try {
    await platformCClient.acceptTask(offer.taskId, contractor.id);
  } catch {
    // Platform C may not be available — proceed with local state
  }

  await db
    .update(taskOffers)
    .set({ status: "accepted", respondedAt: new Date() })
    .where(eq(taskOffers.id, offerId));

  await updateAcceptanceRate(contractor.id);

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

  await updateAcceptanceRate(contractor.id);

  return { success: true };
}

export async function getActiveTasks() {
  const contractor = await requireContractor();

  const offers = await db
    .select()
    .from(taskOffers)
    .where(and(eq(taskOffers.contractorId, contractor.id), eq(taskOffers.status, "accepted")))
    .orderBy(desc(taskOffers.offeredAt));

  const tasksWithRevisionStatus = await Promise.all(
    offers.map(async (offer) => {
      const latestDeliverable = await db
        .select()
        .from(deliverables)
        .where(
          and(
            eq(deliverables.taskId, offer.taskId),
            eq(deliverables.contractorId, contractor.id)
          )
        )
        .orderBy(desc(deliverables.submittedAt))
        .limit(1);

      const d = latestDeliverable[0];

      return {
        ...offer,
        needsRevision: d?.status === "revision_requested",
        revisionNumber: d?.revisionNumber ?? 0,
        lastDeliverableStatus: d?.status ?? null,
      };
    })
  );

  return tasksWithRevisionStatus;
}

export async function getRevisionDetails(taskId: string) {
  const contractor = await requireContractor();

  const allDeliverables = await db
    .select()
    .from(deliverables)
    .where(
      and(eq(deliverables.taskId, taskId), eq(deliverables.contractorId, contractor.id))
    )
    .orderBy(desc(deliverables.submittedAt));

  return {
    deliverables: allDeliverables,
    canRevise: allDeliverables.length > 0 && allDeliverables[0].status === "revision_requested" && allDeliverables[0].revisionNumber < 2,
    revisionCount: allDeliverables[0]?.revisionNumber ?? 0,
    maxRevisionsReached: (allDeliverables[0]?.revisionNumber ?? 0) >= 2,
  };
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
