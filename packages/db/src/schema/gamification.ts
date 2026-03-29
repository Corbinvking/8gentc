import { integer, jsonb, numeric, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { contractors } from "./contractors";

export const achievements = pgTable("achievements", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  iconUrl: text("icon_url"),
  criteria: jsonb("criteria").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contractorAchievements = pgTable("contractor_achievements", {
  id: text("id").primaryKey(),
  contractorId: text("contractor_id")
    .notNull()
    .references(() => contractors.id),
  achievementId: text("achievement_id")
    .notNull()
    .references(() => achievements.id),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
});

export const leaderboardEntries = pgTable("leaderboard_entries", {
  id: text("id").primaryKey(),
  contractorId: text("contractor_id")
    .notNull()
    .references(() => contractors.id),
  period: varchar("period", { length: 50 }).notNull(),
  periodStart: timestamp("period_start").notNull(),
  category: varchar("category", { length: 50 }),
  tier: varchar("tier", { length: 50 }),
  score: numeric("score", { precision: 10, scale: 2 }).notNull(),
  rank: integer("rank"),
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const xpEvents = pgTable("xp_events", {
  id: text("id").primaryKey(),
  contractorId: text("contractor_id")
    .notNull()
    .references(() => contractors.id),
  taskId: text("task_id"),
  amount: integer("amount").notNull(),
  reason: varchar("reason", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
