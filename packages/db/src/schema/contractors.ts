import { integer, jsonb, numeric, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";

export const contractors = pgTable("contractors", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  skills: jsonb("skills").$type<string[]>().default([]),
  rating: numeric("rating", { precision: 3, scale: 2 }).default("0"),
  completedTasks: integer("completed_tasks").default(0),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  stripeConnectId: text("stripe_connect_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
