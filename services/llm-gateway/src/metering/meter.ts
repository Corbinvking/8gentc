import { nanoid } from "nanoid";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import type { LLMCompletionResponse } from "@8gent/shared";

interface MeterRecord {
  id: string;
  userId: string;
  agentId?: string;
  taskId?: string;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  latencyMs: number;
  cacheHit: boolean;
  taskType?: string;
  timestamp: Date;
}

export class LLMMeter {
  private db;
  private buffer: MeterRecord[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private flushIntervalMs: number;
  private batchSize: number;

  constructor(
    databaseUrl: string,
    opts?: { flushIntervalMs?: number; batchSize?: number }
  ) {
    const client = postgres(databaseUrl);
    this.db = drizzle(client);
    this.flushIntervalMs = opts?.flushIntervalMs ?? 5000;
    this.batchSize = opts?.batchSize ?? 100;
    this.startFlushTimer();
  }

  record(
    userId: string,
    agentId: string | undefined,
    taskId: string | undefined,
    provider: string,
    response: LLMCompletionResponse,
    taskType?: string
  ): MeterRecord {
    const record: MeterRecord = {
      id: nanoid(),
      userId,
      agentId,
      taskId,
      provider,
      model: response.modelUsed,
      tokensIn: response.inputTokens,
      tokensOut: response.outputTokens,
      cost: response.cost,
      latencyMs: response.latencyMs,
      cacheHit: response.cacheHit,
      taskType,
      timestamp: new Date(),
    };

    this.buffer.push(record);
    if (this.buffer.length >= this.batchSize) {
      this.flush().catch(() => {});
    }
    return record;
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const records = this.buffer.splice(0);
    const values = records
      .map(
        (r) =>
          `('${r.id}', '${r.userId}', ${r.agentId ? `'${r.agentId}'` : "NULL"}, ${r.taskId ? `'${r.taskId}'` : "NULL"}, '${r.provider}', '${r.model}', ${r.tokensIn}, ${r.tokensOut}, ${r.cost}, ${r.latencyMs}, ${r.cacheHit}, ${r.taskType ? `'${r.taskType}'` : "NULL"}, NOW())`
      )
      .join(", ");

    await this.db.execute(
      sql.raw(
        `INSERT INTO llm_calls (id, user_id, agent_id, task_id, provider, model, tokens_in, tokens_out, cost, latency_ms, cache_hit, task_type, timestamp) VALUES ${values}`
      )
    );
  }

  async getUsage(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{
    totalTokensIn: number;
    totalTokensOut: number;
    totalCost: number;
    callCount: number;
    cacheHitRate: number;
    byModel: Record<string, { tokensIn: number; tokensOut: number; cost: number; calls: number }>;
  }> {
    const result = await this.db.execute(
      sql`SELECT model, SUM(tokens_in)::int as tokens_in, SUM(tokens_out)::int as tokens_out, SUM(cost::numeric)::float as cost, COUNT(*)::int as calls, SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END)::int as cache_hits FROM llm_calls WHERE user_id = ${userId} AND timestamp >= ${periodStart} AND timestamp <= ${periodEnd} GROUP BY model`
    );

    const rows = result.rows as Array<{
      model: string;
      tokens_in: number;
      tokens_out: number;
      cost: number;
      calls: number;
      cache_hits: number;
    }>;

    let totalTokensIn = 0;
    let totalTokensOut = 0;
    let totalCost = 0;
    let callCount = 0;
    let cacheHits = 0;
    const byModel: Record<string, { tokensIn: number; tokensOut: number; cost: number; calls: number }> = {};

    for (const row of rows) {
      totalTokensIn += row.tokens_in;
      totalTokensOut += row.tokens_out;
      totalCost += row.cost;
      callCount += row.calls;
      cacheHits += row.cache_hits;
      byModel[row.model] = {
        tokensIn: row.tokens_in,
        tokensOut: row.tokens_out,
        cost: row.cost,
        calls: row.calls,
      };
    }

    return {
      totalTokensIn,
      totalTokensOut,
      totalCost,
      callCount,
      cacheHitRate: callCount > 0 ? cacheHits / callCount : 0,
      byModel,
    };
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(() => {});
    }, this.flushIntervalMs);
  }

  async shutdown(): Promise<void> {
    if (this.flushTimer) clearInterval(this.flushTimer);
    await this.flush();
  }
}
