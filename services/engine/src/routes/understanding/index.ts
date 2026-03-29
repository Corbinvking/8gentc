import type { FastifyInstance } from "fastify";
import { db } from "../../lib/db.js";
import { understandingItems } from "@8gent/db";
import { eq, and } from "drizzle-orm";

export async function understandingRoutes(app: FastifyInstance): Promise<void> {
  app.get("/understanding/notifications", async (request) => {
    const userId = request.authUser!.userId;

    const items = await db
      .select()
      .from(understandingItems)
      .where(
        and(
          eq(understandingItems.userId, userId),
          eq(understandingItems.status, "pending")
        )
      );

    return items;
  });

  app.post("/understanding/feedback", async (request, reply) => {
    const userId = request.authUser!.userId;
    const { itemId, feedback } = request.body as {
      itemId: string;
      feedback: "helpful" | "not_helpful" | "dismissed";
    };

    const [item] = await db
      .select()
      .from(understandingItems)
      .where(
        and(
          eq(understandingItems.id, itemId),
          eq(understandingItems.userId, userId)
        )
      );

    if (!item) return reply.status(404).send({ error: "Item not found" });

    await db
      .update(understandingItems)
      .set({
        feedback,
        status: feedback === "dismissed" ? "dismissed" : "acknowledged",
      })
      .where(eq(understandingItems.id, itemId));

    return { status: "ok" };
  });
}
