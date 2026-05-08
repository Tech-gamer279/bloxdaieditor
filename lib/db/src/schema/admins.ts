import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const adminsTable = pgTable("admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique(),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Admin = typeof adminsTable.$inferSelect;
