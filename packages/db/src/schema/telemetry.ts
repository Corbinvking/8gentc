import { jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const telemetryEvents = pgTable("telemetry_events", {
  id: text("id").primaryKey(),
  type: varchar("type", { length: 100 }).notNull(),
  agentId: text("agent_id"),
  userId: text("user_id"),
  taskId: text("task_id"),
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});
