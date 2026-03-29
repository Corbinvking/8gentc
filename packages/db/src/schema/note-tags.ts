import { pgTable, text, timestamp, varchar, primaryKey } from "drizzle-orm/pg-core";
import { notes } from "./notes";

export const noteTags = pgTable(
  "note_tags",
  {
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    tag: varchar("tag", { length: 100 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.noteId, table.tag] })]
);
