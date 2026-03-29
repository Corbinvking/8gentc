import { boolean, integer, jsonb, numeric, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";

export const contractors = pgTable("contractors", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  skills: jsonb("skills").$type<string[]>().default([]),
  rating: numeric("rating", { precision: 3, scale: 2 }).default("0"),
  completedTasks: integer("completed_tasks").default(0),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  tier: varchar("tier", { length: 50 }).notNull().default("new"),
  bio: text("bio"),
  timezone: varchar("timezone", { length: 100 }),
  location: varchar("location", { length: 255 }),
  availabilityPreference: varchar("availability_preference", { length: 50 }),
  onboardingStatus: varchar("onboarding_status", { length: 50 }).notNull().default("submitted"),
  assessmentScore: numeric("assessment_score", { precision: 5, scale: 2 }),
  compositeScore: numeric("composite_score", { precision: 5, scale: 2 }),
  xp: integer("xp").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  acceptanceRate: numeric("acceptance_rate", { precision: 5, scale: 2 }),
  stripeConnectId: text("stripe_connect_id"),
  contractorAgreementSignedAt: timestamp("contractor_agreement_signed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contractorProfiles = pgTable("contractor_profiles", {
  id: text("id").primaryKey(),
  contractorId: text("contractor_id")
    .notNull()
    .references(() => contractors.id),
  portfolioLinks: jsonb("portfolio_links").$type<string[]>().default([]),
  experienceLevels: jsonb("experience_levels")
    .$type<Array<{ category: string; level: string; yearsOfExperience?: number }>>()
    .default([]),
  workSamples: jsonb("work_samples").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contractorAssessments = pgTable("contractor_assessments", {
  id: text("id").primaryKey(),
  contractorId: text("contractor_id")
    .notNull()
    .references(() => contractors.id),
  taskType: varchar("task_type", { length: 50 }).notNull(),
  prompt: text("prompt").notNull(),
  response: text("response"),
  tokenEfficiencyScore: numeric("token_efficiency_score", { precision: 5, scale: 2 }),
  outputQualityScore: numeric("output_quality_score", { precision: 5, scale: 2 }),
  speedScore: numeric("speed_score", { precision: 5, scale: 2 }),
  compositeScore: numeric("composite_score", { precision: 5, scale: 2 }),
  timeLimit: integer("time_limit").notNull(),
  timeTaken: integer("time_taken"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const contractorSkills = pgTable("contractor_skills", {
  id: text("id").primaryKey(),
  contractorId: text("contractor_id")
    .notNull()
    .references(() => contractors.id),
  category: varchar("category", { length: 50 }).notNull(),
  level: varchar("level", { length: 50 }).notNull(),
  yearsOfExperience: integer("years_of_experience"),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
