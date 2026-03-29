import { integer, jsonb, numeric, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { contractors } from "./contractors";

export const taskOffers = pgTable("task_offers", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(),
  contractorId: text("contractor_id")
    .notNull()
    .references(() => contractors.id),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(),
  complexity: integer("complexity").notNull(),
  harnessType: varchar("harness_type", { length: 50 }).notNull(),
  estimatedDuration: integer("estimated_duration"),
  payoutMin: numeric("payout_min", { precision: 10, scale: 2 }),
  payoutMax: numeric("payout_max", { precision: 10, scale: 2 }),
  deadline: timestamp("deadline"),
  clientContextSummary: text("client_context_summary"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  offeredAt: timestamp("offered_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  respondedAt: timestamp("responded_at"),
  rejectionReason: text("rejection_reason"),
});

export const deliverables = pgTable("deliverables", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(),
  contractorId: text("contractor_id")
    .notNull()
    .references(() => contractors.id),
  content: text("content"),
  fileUrls: jsonb("file_urls").$type<string[]>().default([]),
  revisionOf: text("revision_of"),
  revisionNumber: integer("revision_number").notNull().default(0),
  status: varchar("status", { length: 50 }).notNull().default("submitted"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const taskSessions = pgTable("task_sessions", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(),
  contractorId: text("contractor_id")
    .notNull()
    .references(() => contractors.id),
  harnessType: varchar("harness_type", { length: 50 }).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  totalTokensUsed: integer("total_tokens_used").default(0),
  totalCost: numeric("total_cost", { precision: 10, scale: 6 }).default("0"),
  status: varchar("status", { length: 50 }).notNull().default("active"),
});
