import { jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";

export const understandingItems = pgTable("understanding_items", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(),
  priority: varchar("priority", { length: 20 }).notNull().default("medium"),
  relevantNotes: jsonb("relevant_notes").$type<string[]>().default([]),
  suggestedAction: text("suggested_action").notNull(),
  expiresAt: timestamp("expires_at"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  feedback: varchar("feedback", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
