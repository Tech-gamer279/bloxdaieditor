import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { forumPostsTable, forumRepliesTable, profilesTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/forum/posts", async (_req, res): Promise<void> => {
  const posts = await db.select().from(forumPostsTable).orderBy(desc(forumPostsTable.createdAt)).limit(100);
  res.json(posts);
});

router.post("/forum/posts", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const { title, content } = req.body as { title?: string; content?: string };
  if (!title?.trim() || !content?.trim()) { res.status(400).json({ error: "Missing title or content" }); return; }
  if (title.length > 200) { res.status(400).json({ error: "Title too long (max 200 chars)" }); return; }
  if (content.length > 5000) { res.status(400).json({ error: "Content too long (max 5000 chars)" }); return; }
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
  const authorName = profile?.username || "anonymous";
  const [post] = await db.insert(forumPostsTable).values({ userId, authorName, title: title.trim(), content: content.trim() }).returning();
  res.status(201).json(post);
});

router.delete("/forum/posts/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const id = req.params.id as string;
  const [post] = await db.select().from(forumPostsTable).where(eq(forumPostsTable.id, id));
  if (!post) { res.status(404).json({ error: "Not found" }); return; }
  if (post.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(forumPostsTable).where(eq(forumPostsTable.id, id));
  res.sendStatus(204);
});

router.get("/forum/posts/:id/replies", async (req, res): Promise<void> => {
  const postId = req.params.id as string;
  const replies = await db.select().from(forumRepliesTable).where(eq(forumRepliesTable.postId, postId)).orderBy(forumRepliesTable.createdAt);
  res.json(replies);
});

router.post("/forum/posts/:id/replies", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const postId = req.params.id as string;
  const { content } = req.body as { content?: string };
  if (!content?.trim()) { res.status(400).json({ error: "Missing content" }); return; }
  if (content.length > 2000) { res.status(400).json({ error: "Reply too long (max 2000 chars)" }); return; }
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
  const authorName = profile?.username || "anonymous";
  const [reply] = await db.insert(forumRepliesTable).values({ postId, userId, authorName, content: content.trim() }).returning();
  await db.update(forumPostsTable).set({ replyCount: sql`${forumPostsTable.replyCount} + 1` }).where(eq(forumPostsTable.id, postId));
  res.status(201).json(reply);
});

export default router;
