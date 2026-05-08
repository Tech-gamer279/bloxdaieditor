import { pgTable, text, timestamp, uuid, unique } from "drizzle-orm/pg-core";

export const friendRequestsTable = pgTable("friend_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromUserId: text("from_user_id").notNull(),
  toUserId: text("to_user_id").notNull(),
  status: text("status").notNull().default("pending"), // pending | accepted | declined
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("uq_friend_request_pair").on(t.fromUserId, t.toUserId),
]);

export type FriendRequest = typeof friendRequestsTable.$inferSelect;
