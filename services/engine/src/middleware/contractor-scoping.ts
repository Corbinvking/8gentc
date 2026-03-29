import type { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../lib/db.js";
import { workstreams, dispatchOffers } from "@8gent/db";
import { eq, and } from "drizzle-orm";

export async function contractorScoping(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.authUser || request.authUser.role !== "contractor") return;

  const params = request.params as Record<string, string>;
  const taskId = params.taskId ?? params.id;
  if (!taskId) return;

  const assignedWorkstreams = await db
    .select({ workstreamId: workstreams.id })
    .from(workstreams)
    .where(eq(workstreams.assignedContractorId, request.authUser.userId));

  const acceptedOffers = await db
    .select({ workstreamId: dispatchOffers.workstreamId })
    .from(dispatchOffers)
    .where(
      and(
        eq(dispatchOffers.contractorId, request.authUser.userId),
        eq(dispatchOffers.status, "accepted")
      )
    );

  const authorizedWorkstreams = new Set([
    ...assignedWorkstreams.map((w) => w.workstreamId),
    ...acceptedOffers.map((o) => o.workstreamId),
  ]);

  const taskWorkstreams = await db
    .select({ id: workstreams.id })
    .from(workstreams)
    .where(eq(workstreams.taskId, taskId));

  const hasAccess = taskWorkstreams.some((tw) => authorizedWorkstreams.has(tw.id));

  if (!hasAccess) {
    return reply.status(403).send({ error: "Access denied: not assigned to this task" });
  }
}
