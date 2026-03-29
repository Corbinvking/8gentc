import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";
import { workspaces } from "./workspaces";

export const notes = pgTable("notes", {
  id: text("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content"),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
