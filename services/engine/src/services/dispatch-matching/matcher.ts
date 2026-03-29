import { nanoid } from "nanoid";
import { db } from "../../lib/db.js";
import { dispatchOffers, workstreams, contractors } from "@8gent/db";
import { eq, and } from "drizzle-orm";
import { scoreMatch, type ContractorProfile, type MatchScore } from "./scorer.js";
import type { Workstream } from "@8gent/shared";

export interface DispatchResult {
  workstreamId: string;
  contractorId: string;
  score: MatchScore;
  offerId: string;
}

export async function dispatchWorkstreams(
  pendingWorkstreams: Workstream[],
  availableContractors: ContractorProfile[]
): Promise<DispatchResult[]> {
  const results: DispatchResult[] = [];
  const assignedContractors = new Set<string>();

  for (const ws of pendingWorkstreams) {
    const eligible = availableContractors.filter(
      (c) => !assignedContractors.has(c.id) && c.status === "active" && c.activeTasks < c.maxConcurrentTasks
    );

    if (eligible.length === 0) continue;

    const scores = eligible
      .map((c) => ({ contractor: c, score: scoreMatch(ws, c) }))
      .sort((a, b) => b.score.composite - a.score.composite);

    const best = scores[0];
    if (!best || best.score.composite < 20) continue;

    const offerId = nanoid();
    await db.insert(dispatchOffers).values({
      id: offerId,
      workstreamId: ws.id,
      contractorId: best.contractor.id,
      status: "pending",
      offeredAt: new Date(),
    });

    results.push({
      workstreamId: ws.id,
      contractorId: best.contractor.id,
      score: best.score,
      offerId,
    });

    assignedContractors.add(best.contractor.id);
  }

  return results;
}

export async function acceptOffer(offerId: string): Promise<void> {
  const [offer] = await db
    .select()
    .from(dispatchOffers)
    .where(eq(dispatchOffers.id, offerId));

  if (!offer) throw new Error("Offer not found");
  if (offer.status !== "pending") throw new Error("Offer already responded to");

  await db
    .update(dispatchOffers)
    .set({ status: "accepted", respondedAt: new Date() })
    .where(eq(dispatchOffers.id, offerId));

  await db
    .update(workstreams)
    .set({
      status: "assigned",
      assignedContractorId: offer.contractorId,
      updatedAt: new Date(),
    })
    .where(eq(workstreams.id, offer.workstreamId));
}

export async function rejectOffer(offerId: string): Promise<void> {
  const [offer] = await db
    .select()
    .from(dispatchOffers)
    .where(eq(dispatchOffers.id, offerId));

  if (!offer) throw new Error("Offer not found");

  await db
    .update(dispatchOffers)
    .set({ status: "rejected", respondedAt: new Date() })
    .where(eq(dispatchOffers.id, offerId));
}

export async function getPendingOffersForContractor(
  contractorId: string
): Promise<Array<typeof dispatchOffers.$inferSelect>> {
  return db
    .select()
    .from(dispatchOffers)
    .where(
      and(
        eq(dispatchOffers.contractorId, contractorId),
        eq(dispatchOffers.status, "pending")
      )
    );
}
