import { db } from "../../lib/db.js";
import { telemetryEvents } from "@8gent/db";
import { sql, eq, and, gte, lte } from "drizzle-orm";

export async function queryEvents(filters: {
  userId?: string;
  agentId?: string;
  taskId?: string;
  type?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}) {
  const conditions = [];

  if (filters.userId) conditions.push(eq(telemetryEvents.userId, filters.userId));
  if (filters.agentId) conditions.push(eq(telemetryEvents.agentId, filters.agentId));
  if (filters.taskId) conditions.push(eq(telemetryEvents.taskId, filters.taskId));
  if (filters.type) conditions.push(eq(telemetryEvents.type, filters.type));
  if (filters.from) conditions.push(gte(telemetryEvents.timestamp, filters.from));
  if (filters.to) conditions.push(lte(telemetryEvents.timestamp, filters.to));

  let query = db.select().from(telemetryEvents);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  return query.limit(filters.limit ?? 100).offset(filters.offset ?? 0);
}

export async function getEventCounts(
  from: Date,
  to: Date
): Promise<Record<string, number>> {
  const rows = await db
    .select({
      type: telemetryEvents.type,
      count: sql<number>`count(*)::int`,
    })
    .from(telemetryEvents)
    .where(and(gte(telemetryEvents.timestamp, from), lte(telemetryEvents.timestamp, to)))
    .groupBy(telemetryEvents.type);

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.type] = row.count;
  }
  return counts;
}
