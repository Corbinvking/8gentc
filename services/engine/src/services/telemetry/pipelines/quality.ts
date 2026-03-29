import { db } from "../../../lib/db.js";
import { deliverables } from "@8gent/db";
import { sql, gte, lte, and } from "drizzle-orm";

export interface QualityMetrics {
  totalDeliverables: number;
  acceptedRate: number;
  revisionRate: number;
  rejectedRate: number;
  avgReviewTimeMs: number;
}

export async function analyzeQuality(
  from: Date,
  to: Date
): Promise<QualityMetrics> {
  const [result] = await db
    .select({
      total: sql<number>`count(*)::int`,
      accepted: sql<number>`count(*) filter (where status = 'accepted')::int`,
      revision: sql<number>`count(*) filter (where status = 'revision_requested')::int`,
      rejected: sql<number>`count(*) filter (where status = 'rejected')::int`,
      avgReview: sql<number>`avg(extract(epoch from (reviewed_at - submitted_at)) * 1000) filter (where reviewed_at is not null)::float`,
    })
    .from(deliverables)
    .where(
      and(
        gte(deliverables.submittedAt, from),
        lte(deliverables.submittedAt, to)
      )
    );

  const total = result?.total ?? 0;

  return {
    totalDeliverables: total,
    acceptedRate: total > 0 ? (result?.accepted ?? 0) / total : 0,
    revisionRate: total > 0 ? (result?.revision ?? 0) / total : 0,
    rejectedRate: total > 0 ? (result?.rejected ?? 0) / total : 0,
    avgReviewTimeMs: result?.avgReview ?? 0,
  };
}
