import { jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { agents } from "./agents";

export const agentOutputs = pgTable("agent_outputs", {
  id: text("id").primaryKey(),
  agentId: text("agent_id")
    .notNull()
    .references(() => agents.id),
  type: varchar("type", { length: 100 }).notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
