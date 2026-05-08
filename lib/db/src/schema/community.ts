import { pgTable, text, timestamp, integer, boolean, pgEnum, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const serverRoleEnum = pgEnum("server_role", ["owner", "admin", "member"]);
export const channelTypeEnum = pgEnum("channel_type", ["text", "voice"]);

export const serversTable = pgTable("servers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  iconUrl: text("icon_url"),
  ownerId: text("owner_id").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const channelsTable = pgTable("channels", {
  id: uuid("id").primaryKey().defaultRandom(),
  serverId: uuid("server_id").notNull().references(() => serversTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: channelTypeEnum("type").notNull().default("text"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const serverMembersTable = pgTable("server_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  serverId: uuid("server_id").notNull().references(() => serversTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  role: serverRoleEnum("role").notNull().default("member"),
  username: text("username"),
  avatarUrl: text("avatar_url"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messagesTable = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  channelId: uuid("channel_id").notNull().references(() => channelsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  authorName: text("author_name").notNull(),
  content: text("content").notNull(),
  attachmentUrl: text("attachment_url"),
  attachmentName: text("attachment_name"),
  attachmentType: text("attachment_type"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messageReactionsTable = pgTable("message_reactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id").notNull().references(() => messagesTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  emoji: text("emoji").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dmConversationsTable = pgTable("dm_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userA: text("user_a").notNull(),
  userB: text("user_b").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dmMessagesTable = pgTable("dm_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => dmConversationsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const voiceParticipantsTable = pgTable("voice_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  channelId: uuid("channel_id").notNull().references(() => channelsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  username: text("username"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reportsTable = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: text("reporter_id").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  targetUserId: text("target_user_id"),
  serverId: uuid("server_id"),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertServerSchema = createInsertSchema(serversTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertChannelSchema = createInsertSchema(channelsTable).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReactionSchema = createInsertSchema(messageReactionsTable).omit({ id: true, createdAt: true });
export const insertDmMessageSchema = createInsertSchema(dmMessagesTable).omit({ id: true, createdAt: true });
export const insertServerMemberSchema = createInsertSchema(serverMembersTable).omit({ id: true, joinedAt: true });

export type Server = typeof serversTable.$inferSelect;
export type Channel = typeof channelsTable.$inferSelect;
export type Message = typeof messagesTable.$inferSelect;
export type MessageReaction = typeof messageReactionsTable.$inferSelect;
export type DmConversation = typeof dmConversationsTable.$inferSelect;
export type DmMessage = typeof dmMessagesTable.$inferSelect;
export type VoiceParticipant = typeof voiceParticipantsTable.$inferSelect;
export type ServerMember = typeof serverMembersTable.$inferSelect;
export type Report = typeof reportsTable.$inferSelect;
