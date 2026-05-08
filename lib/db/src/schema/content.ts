import { pgTable, text, timestamp, integer, uuid } from "drizzle-orm/pg-core";

export const profilesTable = pgTable("profiles", {
  userId: text("user_id").primaryKey(),
  username: text("username"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  rankPoints: integer("rank_points").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const snippetsTable = pgTable("snippets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  authorName: text("author_name").notNull(),
  title: text("title").notNull(),
  code: text("code").notNull(),
  likes: integer("likes").notNull().default(0),
  views: integer("views").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const snippetLikesTable = pgTable("snippet_likes", {
  id: uuid("id").primaryKey().defaultRandom(),
  snippetId: uuid("snippet_id").notNull().references(() => snippetsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const forumPostsTable = pgTable("forum_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  authorName: text("author_name").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  replyCount: integer("reply_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const forumRepliesTable = pgTable("forum_replies", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => forumPostsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  authorName: text("author_name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const schematicsTable = pgTable("schematics", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  authorName: text("author_name").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  previewUrl: text("preview_url"),
  downloads: integer("downloads").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const schematicLikesTable = pgTable("schematic_likes", {
  id: uuid("id").primaryKey().defaultRandom(),
  schematicId: uuid("schematic_id").notNull().references(() => schematicsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const modsTable = pgTable("mods", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  authorName: text("author_name").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  version: text("version").notNull().default("1.0.0"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  previewUrl: text("preview_url"),
  downloads: integer("downloads").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const modLikesTable = pgTable("mod_likes", {
  id: uuid("id").primaryKey().defaultRandom(),
  modId: uuid("mod_id").notNull().references(() => modsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Profile = typeof profilesTable.$inferSelect;
export type Snippet = typeof snippetsTable.$inferSelect;
export type SnippetLike = typeof snippetLikesTable.$inferSelect;
export type ForumPost = typeof forumPostsTable.$inferSelect;
export type ForumReply = typeof forumRepliesTable.$inferSelect;
export type Schematic = typeof schematicsTable.$inferSelect;
export type Mod = typeof modsTable.$inferSelect;
