import { jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";

export const swarmSessions = pgTable("swarm_sessions", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  template: varchar("template", { length: 100 }).notNull(),
  coordinatorAgentId: text("coordinator_agent_id"),
  workerAgentIds: jsonb("worker_agent_ids").$type<string[]>().default([]),
  taskId: text("task_id"),
  status: varchar("status", { length: 50 }).notNull().default("initializing"),
  config: jsonb("config").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
