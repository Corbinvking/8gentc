import { numeric, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { contractors } from "./contractors";

export const payouts = pgTable("payouts", {
  id: text("id").primaryKey(),
  contractorId: text("contractor_id")
    .notNull()
    .references(() => contractors.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  baseAmount: numeric("base_amount", { precision: 10, scale: 2 }).notNull(),
  performanceMultiplier: numeric("performance_multiplier", { precision: 4, scale: 2 }).notNull(),
  efficiencyBonus: numeric("efficiency_bonus", { precision: 10, scale: 2 }).notNull().default("0"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  stripePayoutId: text("stripe_payout_id"),
  stripeTransferId: text("stripe_transfer_id"),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payoutLineItems = pgTable("payout_line_items", {
  id: text("id").primaryKey(),
  payoutId: text("payout_id")
    .notNull()
    .references(() => payouts.id),
  taskId: text("task_id").notNull(),
  taskTitle: varchar("task_title", { length: 500 }),
  baseRate: numeric("base_rate", { precision: 10, scale: 2 }).notNull(),
  performanceMultiplier: numeric("performance_multiplier", { precision: 4, scale: 2 }).notNull(),
  efficiencyBonus: numeric("efficiency_bonus", { precision: 10, scale: 2 }).default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  completedAt: timestamp("completed_at").notNull(),
});

export const payoutDisputes = pgTable("payout_disputes", {
  id: text("id").primaryKey(),
  contractorId: text("contractor_id")
    .notNull()
    .references(() => contractors.id),
  payoutId: text("payout_id").references(() => payouts.id),
  taskId: text("task_id"),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("open"),
  resolution: text("resolution"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});
