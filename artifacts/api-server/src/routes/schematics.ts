import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { schematicsTable, schematicLikesTable, profilesTable } from "@workspace/db";
import { requireAuth, optionalAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/schematics", optionalAuth, async (req, res): Promise<void> => {
  const schematics = await db.select().from(schematicsTable).orderBy(desc(schematicsTable.createdAt)).limit(100);
  const userId = (req as AuthedRequest).clerkUserId;
  if (userId) {
    const likes = await db.select().from(schematicLikesTable).where(eq(schematicLikesTable.userId, userId));
    const likedIds = new Set(likes.map((l) => l.schematicId));
    res.json(schematics.map((s) => ({ ...s, liked: likedIds.has(s.id) })));
  } else {
    res.json(schematics.map((s) => ({ ...s, liked: false })));
  }
});

router.post("/schematics", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const { title, description, file_url, file_name, preview_url } = req.body as {
    title?: string; description?: string; file_url?: string; file_name?: string; preview_url?: string;
  };
  if (!title?.trim()) { res.status(400).json({ error: "Missing title" }); return; }
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
  const authorName = profile?.username || "anonymous";
  const [schematic] = await db.insert(schematicsTable).values({
    userId, authorName, title: title.trim(),
    description: description?.trim() || null,
    fileUrl: file_url || null, fileName: file_name || null, previewUrl: preview_url || null,
  }).returning();
  res.status(201).json({ ...schematic, liked: false });
});

router.post("/schematics/:id/like", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const schematicId = req.params.id as string;
  const existing = await db.select().from(schematicLikesTable).where(
    and(eq(schematicLikesTable.schematicId, schematicId), eq(schematicLikesTable.userId, userId))
  );
  if (existing.length) {
    await db.delete(schematicLikesTable).where(eq(schematicLikesTable.id, existing[0].id));
    await db.update(schematicsTable)
      .set({ likes: sql<number>`GREATEST(${schematicsTable.likes} - 1, 0)` })
      .where(eq(schematicsTable.id, schematicId));
    res.json({ liked: false });
  } else {
    await db.insert(schematicLikesTable).values({ schematicId, userId });
    await db.update(schematicsTable)
      .set({ likes: sql<number>`${schematicsTable.likes} + 1` })
      .where(eq(schematicsTable.id, schematicId));
    res.json({ liked: true });
  }
});

router.post("/schematics/:id/download", async (req, res): Promise<void> => {
  const id = req.params.id as string;
  await db.update(schematicsTable)
    .set({ downloads: sql<number>`${schematicsTable.downloads} + 1` })
    .where(eq(schematicsTable.id, id));
  res.sendStatus(204);
});

router.delete("/schematics/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const id = req.params.id as string;
  const [s] = await db.select().from(schematicsTable).where(eq(schematicsTable.id, id));
  if (!s) { res.status(404).json({ error: "Not found" }); return; }
  if (s.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(schematicsTable).where(eq(schematicsTable.id, id));
  res.sendStatus(204);
});

export default router;
