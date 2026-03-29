import { integer, numeric, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  plan: varchar("plan", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usageRecords = pgTable("usage_records", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  type: varchar("type", { length: 100 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitCost: numeric("unit_cost", { precision: 10, scale: 6 }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});
