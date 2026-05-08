import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { modsTable, modLikesTable, profilesTable } from "@workspace/db";
import { requireAuth, optionalAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/mods", optionalAuth, async (req, res): Promise<void> => {
  const mods = await db.select().from(modsTable).orderBy(desc(modsTable.createdAt)).limit(100);
  const userId = (req as AuthedRequest).clerkUserId;
  if (userId) {
    const likes = await db.select().from(modLikesTable).where(eq(modLikesTable.userId, userId));
    const likedIds = new Set(likes.map((l) => l.modId));
    res.json(mods.map((m) => ({ ...m, liked: likedIds.has(m.id) })));
  } else {
    res.json(mods.map((m) => ({ ...m, liked: false })));
  }
});

router.post("/mods", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const { title, description, version, file_url, file_name, preview_url } = req.body as {
    title?: string; description?: string; version?: string; file_url?: string; file_name?: string; preview_url?: string;
  };
  if (!title?.trim()) { res.status(400).json({ error: "Missing title" }); return; }
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
  const authorName = profile?.username || "anonymous";
  const [mod] = await db.insert(modsTable).values({
    userId, authorName, title: title.trim(),
    description: description?.trim() || null,
    version: version?.trim() || "1.0.0",
    fileUrl: file_url || null, fileName: file_name || null, previewUrl: preview_url || null,
  }).returning();
  res.status(201).json({ ...mod, liked: false });
});

router.post("/mods/:id/like", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const modId = req.params.id as string;
  const existing = await db.select().from(modLikesTable).where(
    and(eq(modLikesTable.modId, modId), eq(modLikesTable.userId, userId))
  );
  if (existing.length) {
    await db.delete(modLikesTable).where(eq(modLikesTable.id, existing[0].id));
    await db.update(modsTable)
      .set({ likes: sql<number>`GREATEST(${modsTable.likes} - 1, 0)` })
      .where(eq(modsTable.id, modId));
    res.json({ liked: false });
  } else {
    await db.insert(modLikesTable).values({ modId, userId });
    await db.update(modsTable)
      .set({ likes: sql<number>`${modsTable.likes} + 1` })
      .where(eq(modsTable.id, modId));
    res.json({ liked: true });
  }
});

router.post("/mods/:id/download", async (req, res): Promise<void> => {
  const id = req.params.id as string;
  await db.update(modsTable)
    .set({ downloads: sql<number>`${modsTable.downloads} + 1` })
    .where(eq(modsTable.id, id));
  res.sendStatus(204);
});

router.delete("/mods/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const id = req.params.id as string;
  const [m] = await db.select().from(modsTable).where(eq(modsTable.id, id));
  if (!m) { res.status(404).json({ error: "Not found" }); return; }
  if (m.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(modsTable).where(eq(modsTable.id, id));
  res.sendStatus(204);
});

export default router;
