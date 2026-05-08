import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { snippetsTable, snippetLikesTable, profilesTable } from "@workspace/db";
import { requireAuth, optionalAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { createNotification } from "../lib/notify";

const router: IRouter = Router();

router.get("/snippets", optionalAuth, async (req, res): Promise<void> => {
  const snippets = await db.select().from(snippetsTable).orderBy(desc(snippetsTable.createdAt)).limit(100);
  const userId = (req as AuthedRequest).clerkUserId;
  if (userId) {
    const likes = await db.select().from(snippetLikesTable).where(eq(snippetLikesTable.userId, userId));
    const likedIds = new Set(likes.map((l) => l.snippetId));
    res.json(snippets.map((s) => ({ ...s, liked: likedIds.has(s.id) })));
  } else {
    res.json(snippets.map((s) => ({ ...s, liked: false })));
  }
});

router.post("/snippets", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const { title, code, author_name } = req.body as { title?: string; code?: string; author_name?: string };
  if (!title?.trim() || !code?.trim()) { res.status(400).json({ error: "Missing title or code" }); return; }
  if (title.length > 200) { res.status(400).json({ error: "Title too long (max 200 chars)" }); return; }

  const profile = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
  const authorName = profile[0]?.username || author_name || "anonymous";

  const [snippet] = await db.insert(snippetsTable).values({ userId, authorName, title: title.trim(), code: code.trim() }).returning();
  await db.insert(profilesTable)
    .values({ userId, rankPoints: 10 })
    .onConflictDoUpdate({
      target: profilesTable.userId,
      set: { rankPoints: sql`${profilesTable.rankPoints} + 5` },
    })
    .catch(() => {});
  res.status(201).json({ ...snippet, liked: false });
});

router.post("/snippets/:id/like", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const snippetId = req.params.id as string;
  const existing = await db.select().from(snippetLikesTable).where(
    and(eq(snippetLikesTable.snippetId, snippetId), eq(snippetLikesTable.userId, userId))
  );
  if (existing.length) {
    await db.delete(snippetLikesTable).where(eq(snippetLikesTable.id, existing[0].id));
    await db.update(snippetsTable)
      .set({ likes: sql`GREATEST(${snippetsTable.likes} - 1, 0)` })
      .where(eq(snippetsTable.id, snippetId));
    res.json({ liked: false });
  } else {
    await db.insert(snippetLikesTable).values({ snippetId, userId });
    await db.update(snippetsTable)
      .set({ likes: sql`${snippetsTable.likes} + 1` })
      .where(eq(snippetsTable.id, snippetId));

    // Notify the snippet owner
    const [snippet] = await db.select().from(snippetsTable).where(eq(snippetsTable.id, snippetId));
    if (snippet) {
      const [liker] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
      await createNotification({
        type: "snippet_like",
        actorUserId: userId,
        actorName: liker?.username ?? null,
        targetUserId: snippet.userId,
        resourceId: snippet.id,
        resourceTitle: snippet.title,
      });
    }

    res.json({ liked: true });
  }
});

router.post("/snippets/:id/view", async (req, res): Promise<void> => {
  const id = req.params.id as string;
  await db.update(snippetsTable)
    .set({ views: sql`${snippetsTable.views} + 1` })
    .where(eq(snippetsTable.id, id));
  res.sendStatus(204);
});

router.delete("/snippets/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const id = req.params.id as string;
  const [snippet] = await db.select().from(snippetsTable).where(eq(snippetsTable.id, id));
  if (!snippet) { res.status(404).json({ error: "Not found" }); return; }
  if (snippet.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(snippetsTable).where(eq(snippetsTable.id, id));
  res.sendStatus(204);
});

export default router;
