import { db } from "../../lib/db.js";
import { dispatchOffers } from "@8gent/db";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import { getQueueDepth } from "./queue.js";

export interface DispatchMetrics {
  queueDepth: number;
  pendingOffers: number;
  avgTimeToAcceptMs: number;
  rejectionRate: number;
  totalOffersToday: number;
}

export async function getDispatchMetrics(): Promise<DispatchMetrics> {
  const depth = await getQueueDepth();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = await db
    .select({
      total: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) filter (where status = 'pending')::int`,
      rejected: sql<number>`count(*) filter (where status = 'rejected')::int`,
      avgResponseMs: sql<number>`avg(extract(epoch from (responded_at - offered_at)) * 1000) filter (where responded_at is not null)::float`,
    })
    .from(dispatchOffers);

  const row = stats[0] ?? { total: 0, pending: 0, rejected: 0, avgResponseMs: 0 };

  return {
    queueDepth: depth,
    pendingOffers: row.pending,
    avgTimeToAcceptMs: row.avgResponseMs ?? 0,
    rejectionRate: row.total > 0 ? row.rejected / row.total : 0,
    totalOffersToday: row.total,
  };
}
