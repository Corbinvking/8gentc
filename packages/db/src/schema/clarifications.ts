import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { tasks } from "./tasks";

export const clarifications = pgTable("clarifications", {
  id: text("id").primaryKey(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id),
  senderType: varchar("sender_type", { length: 20 }).notNull(),
  senderId: text("sender_id").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
