import { pgTable, text, timestamp, boolean, uuid } from "drizzle-orm/pg-core";

export const notificationsTable = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(),
  actorUserId: text("actor_user_id").notNull(),
  actorName: text("actor_name"),
  targetUserId: text("target_user_id").notNull(),
  resourceId: text("resource_id"),
  resourceTitle: text("resource_title"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;
