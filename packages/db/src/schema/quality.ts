import { boolean, integer, jsonb, numeric, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { contractors } from "./contractors";
import { deliverables } from "./task_offers";

export const qualityChecks = pgTable("quality_checks", {
  id: text("id").primaryKey(),
  deliverableId: text("deliverable_id")
    .notNull()
    .references(() => deliverables.id),
  type: varchar("type", { length: 100 }).notNull(),
  passed: boolean("passed").notNull(),
  details: jsonb("details").$type<Record<string, unknown>>().default({}),
  checkedAt: timestamp("checked_at").defaultNow().notNull(),
});

export const clientFeedback = pgTable("client_feedback", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(),
  contractorId: text("contractor_id")
    .notNull()
    .references(() => contractors.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contractorWarnings = pgTable("contractor_warnings", {
  id: text("id").primaryKey(),
  contractorId: text("contractor_id")
    .notNull()
    .references(() => contractors.id),
  type: varchar("type", { length: 100 }).notNull(),
  reason: text("reason").notNull(),
  severity: varchar("severity", { length: 50 }).notNull().default("warning"),
  acknowledgedAt: timestamp("acknowledged_at"),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
});

export const featureFlags = pgTable("feature_flags", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  enabled: boolean("enabled").notNull().default(false),
  rolloutPercentage: integer("rollout_percentage").default(0),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
