import { pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { notes } from "./notes";

export const noteLinks = pgTable(
  "note_links",
  {
    sourceNoteId: text("source_note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    targetNoteId: text("target_note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.sourceNoteId, table.targetNoteId] })]
);
