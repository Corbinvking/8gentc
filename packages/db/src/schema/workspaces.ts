import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
