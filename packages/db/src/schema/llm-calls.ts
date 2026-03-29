import { boolean, integer, numeric, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const llmCalls = pgTable("llm_calls", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  agentId: text("agent_id"),
  taskId: text("task_id"),
  provider: varchar("provider", { length: 50 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  tokensIn: integer("tokens_in").notNull(),
  tokensOut: integer("tokens_out").notNull(),
  cost: numeric("cost", { precision: 12, scale: 8 }).notNull(),
  latencyMs: integer("latency_ms").notNull(),
  cacheHit: boolean("cache_hit").notNull().default(false),
  taskType: varchar("task_type", { length: 100 }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});
