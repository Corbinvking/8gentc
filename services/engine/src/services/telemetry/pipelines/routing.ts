import { db } from "../../../lib/db.js";
import { llmCalls } from "@8gent/db";
import { sql, gte, lte, and } from "drizzle-orm";

export interface RoutingAnalysis {
  byProvider: Array<{
    provider: string;
    calls: number;
    totalCost: number;
    avgLatencyMs: number;
    cacheHitRate: number;
  }>;
  byModel: Array<{
    model: string;
    calls: number;
    totalCost: number;
    avgLatencyMs: number;
  }>;
  totalSavingsFromCache: number;
}

export async function analyzeRouting(
  from: Date,
  to: Date
): Promise<RoutingAnalysis> {
  const byProvider = await db
    .select({
      provider: llmCalls.provider,
      calls: sql<number>`count(*)::int`,
      totalCost: sql<number>`sum(cost::numeric)::float`,
      avgLatency: sql<number>`avg(latency_ms)::int`,
      cacheHits: sql<number>`count(*) filter (where cache_hit)::int`,
    })
    .from(llmCalls)
    .where(and(gte(llmCalls.timestamp, from), lte(llmCalls.timestamp, to)))
    .groupBy(llmCalls.provider);

  const byModel = await db
    .select({
      model: llmCalls.model,
      calls: sql<number>`count(*)::int`,
      totalCost: sql<number>`sum(cost::numeric)::float`,
      avgLatency: sql<number>`avg(latency_ms)::int`,
    })
    .from(llmCalls)
    .where(and(gte(llmCalls.timestamp, from), lte(llmCalls.timestamp, to)))
    .groupBy(llmCalls.model);

  const cacheSavings = byProvider.reduce((sum, p) => {
    const avgCostPerCall = p.calls > 0 ? p.totalCost / (p.calls - p.cacheHits || 1) : 0;
    return sum + avgCostPerCall * p.cacheHits;
  }, 0);

  return {
    byProvider: byProvider.map((p) => ({
      provider: p.provider,
      calls: p.calls,
      totalCost: p.totalCost,
      avgLatencyMs: p.avgLatency,
      cacheHitRate: p.calls > 0 ? p.cacheHits / p.calls : 0,
    })),
    byModel: byModel.map((m) => ({
      model: m.model,
      calls: m.calls,
      totalCost: m.totalCost,
      avgLatencyMs: m.avgLatency,
    })),
    totalSavingsFromCache: cacheSavings,
  };
}
