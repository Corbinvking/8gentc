import type { FastifyInstance } from "fastify";
import { db } from "../../lib/db.js";
import { workstreams } from "@8gent/db";
import { eq } from "drizzle-orm";
import {
  getPendingOffersForContractor,
  acceptOffer,
  rejectOffer,
} from "../../services/dispatch-matching/matcher.js";

export async function dispatchRoutes(app: FastifyInstance): Promise<void> {
  app.get("/dispatch/available-tasks", async (request) => {
    const contractorId = request.authUser!.userId;
    const offers = await getPendingOffersForContractor(contractorId);

    const available = await Promise.all(
      offers.map(async (offer) => {
        const [ws] = await db
          .select()
          .from(workstreams)
          .where(eq(workstreams.id, offer.workstreamId));
        return {
          offerId: offer.id,
          workstream: ws,
          offeredAt: offer.offeredAt,
        };
      })
    );

    return available.filter((a) => a.workstream);
  });

  app.post("/dispatch/accept", async (request, reply) => {
    const { offerId } = request.body as { offerId: string };

    try {
      await acceptOffer(offerId);
      return { status: "accepted" };
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  app.post("/dispatch/reject", async (request, reply) => {
    const { offerId } = request.body as { offerId: string };

    try {
      await rejectOffer(offerId);
      return { status: "rejected" };
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });
}
