import { boolean, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { contractors } from "./contractors";

export const shifts = pgTable("shifts", {
  id: text("id").primaryKey(),
  contractorId: text("contractor_id")
    .notNull()
    .references(() => contractors.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  type: varchar("type", { length: 50 }).notNull().default("one_off"),
  status: varchar("status", { length: 50 }).notNull().default("scheduled"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const recurringSchedules = pgTable("recurring_schedules", {
  id: text("id").primaryKey(),
  contractorId: text("contractor_id")
    .notNull()
    .references(() => contractors.id),
  dayOfWeek: integer("day_of_week").notNull(),
  startMinute: integer("start_minute").notNull(),
  endMinute: integer("end_minute").notNull(),
  timezone: varchar("timezone", { length: 100 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contractorAvailability = pgTable("contractor_availability", {
  contractorId: text("contractor_id")
    .primaryKey()
    .references(() => contractors.id),
  isOnline: boolean("is_online").notNull().default(false),
  lastActiveAt: timestamp("last_active_at").defaultNow().notNull(),
  autoTimeoutAt: timestamp("auto_timeout_at"),
  currentShiftId: text("current_shift_id"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
