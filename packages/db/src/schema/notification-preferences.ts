import { boolean, pgTable, text, varchar, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./users";

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 })
      .notNull()
      .$type<"goal_nudge" | "agent_finding" | "stale_content" | "system">(),
    inApp: boolean("in_app").notNull().default(true),
    chat: boolean("chat").notNull().default(false),
    email: boolean("email").notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.userId, table.type] })]
);
