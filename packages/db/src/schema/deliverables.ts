import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { tasks } from "./tasks";
import { workstreams } from "./workstreams";
import { contractors } from "./contractors";

export const deliverables = pgTable("deliverables", {
  id: text("id").primaryKey(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id),
  workstreamId: text("workstream_id").references(() => workstreams.id),
  contractorId: text("contractor_id")
    .notNull()
    .references(() => contractors.id),
  content: text("content").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("submitted"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
});
