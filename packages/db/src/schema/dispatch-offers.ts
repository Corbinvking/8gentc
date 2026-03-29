import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { workstreams } from "./workstreams";
import { contractors } from "./contractors";

export const dispatchOffers = pgTable("dispatch_offers", {
  id: text("id").primaryKey(),
  workstreamId: text("workstream_id")
    .notNull()
    .references(() => workstreams.id),
  contractorId: text("contractor_id")
    .notNull()
    .references(() => contractors.id),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  offeredAt: timestamp("offered_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
});
