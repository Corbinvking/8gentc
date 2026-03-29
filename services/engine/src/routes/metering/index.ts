import type { FastifyInstance } from "fastify";
import { aggregateBilling } from "../../services/telemetry/pipelines/billing.js";

export async function meteringRoutes(app: FastifyInstance): Promise<void> {
  app.get("/metering/usage", async (request) => {
    const userId = request.authUser!.userId;
    const { from, to } = request.query as { from?: string; to?: string };

    const now = new Date();
    const periodStart = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = to ? new Date(to) : now;

    const usage = await aggregateBilling(userId, periodStart, periodEnd);
    return usage;
  });
}
