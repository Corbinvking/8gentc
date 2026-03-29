import { jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";

export const agents = pgTable("agents", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  status: varchar("status", { length: 50 }).notNull().default("idle"),
  skills: jsonb("skills").$type<string[]>().default([]),
  config: jsonb("config").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
