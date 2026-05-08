import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const badgesTable = pgTable("badges", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  emoji: text("emoji").notNull().default("🏅"),
  color: text("color").notNull().default("#6366f1"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userBadgesTable = pgTable("user_badges", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  badgeId: uuid("badge_id").notNull().references(() => badgesTable.id, { onDelete: "cascade" }),
  grantedBy: text("granted_by").notNull(),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Badge = typeof badgesTable.$inferSelect;
export type UserBadge = typeof userBadgesTable.$inferSelect;
