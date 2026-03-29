import { integer, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { tasks } from "./tasks";

export const workstreams = pgTable("workstreams", {
  id: text("id").primaryKey(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  domain: varchar("domain", { length: 100 }).notNull(),
  complexityTier: integer("complexity_tier").notNull().default(1),
  estimatedTokens: integer("estimated_tokens"),
  estimatedDurationMinutes: integer("estimated_duration_minutes"),
  dependencies: jsonb("dependencies").$type<string[]>().default([]),
  successCriteria: jsonb("success_criteria").$type<string[]>().default([]),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  assignedContractorId: text("assigned_contractor_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
