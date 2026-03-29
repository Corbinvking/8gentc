import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";
import { workspaces } from "./workspaces";

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  priority: varchar("priority", { length: 50 }).notNull().default("medium"),
  assignedAgentId: text("assigned_agent_id"),
  assignedContractorId: text("assigned_contractor_id"),
  createdById: text("created_by_id")
    .notNull()
    .references(() => users.id),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});
