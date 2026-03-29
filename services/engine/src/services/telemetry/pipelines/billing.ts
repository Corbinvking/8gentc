import { db } from "../../../lib/db.js";
import { llmCalls, usageRecords } from "@8gent/db";
import { sql, eq, and, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface BillingAggregation {
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCost: number;
  totalCalls: number;
}

export async function aggregateBilling(
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<BillingAggregation> {
  const [result] = await db
    .select({
      totalIn: sql<number>`coalesce(sum(tokens_in), 0)::int`,
      totalOut: sql<number>`coalesce(sum(tokens_out), 0)::int`,
      totalCost: sql<number>`coalesce(sum(cost::numeric), 0)::float`,
      totalCalls: sql<number>`count(*)::int`,
    })
    .from(llmCalls)
    .where(
      and(
        eq(llmCalls.userId, userId),
        gte(llmCalls.timestamp, periodStart),
        lte(llmCalls.timestamp, periodEnd)
      )
    );

  return {
    userId,
    periodStart,
    periodEnd,
    totalTokensIn: result?.totalIn ?? 0,
    totalTokensOut: result?.totalOut ?? 0,
    totalCost: result?.totalCost ?? 0,
    totalCalls: result?.totalCalls ?? 0,
  };
}

export async function createUsageRecord(
  userId: string,
  type: string,
  quantity: number,
  unitCost: number
): Promise<void> {
  await db.insert(usageRecords).values({
    id: nanoid(),
    userId,
    type,
    quantity,
    unitCost: unitCost.toFixed(6),
    timestamp: new Date(),
  });
}
