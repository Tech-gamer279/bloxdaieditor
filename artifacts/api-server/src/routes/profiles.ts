import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { profilesTable, snippetsTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/profiles/top", async (_req, res): Promise<void> => {
  const profiles = await db.select().from(profilesTable).orderBy(desc(profilesTable.rankPoints)).limit(10);
  res.json(profiles);
});

router.get("/profiles/by-username/:username", async (req, res): Promise<void> => {
  const username = req.params.username as string;
  const profiles = await db.select().from(profilesTable);
  const profile = profiles.find((p) => p.username?.toLowerCase() === username.toLowerCase());
  if (!profile) { res.status(404).json({ error: "Not found" }); return; }
  const snippets = await db.select().from(snippetsTable).where(eq(snippetsTable.userId, profile.userId)).orderBy(desc(snippetsTable.createdAt));
  res.json({ profile, snippets });
});

router.get("/profiles/:userId", async (req, res): Promise<void> => {
  const userId = req.params.userId as string;
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
  const snippets = await db.select().from(snippetsTable).where(eq(snippetsTable.userId, userId)).orderBy(desc(snippetsTable.createdAt));
  res.json({ profile: profile || null, snippets });
});

router.put("/profiles", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const { username, bio, avatar_url } = req.body as { username?: string; bio?: string; avatar_url?: string };
  const existing = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
  if (existing.length) {
    const [updated] = await db.update(profilesTable).set({
      username: username?.trim() || existing[0].username,
      bio: bio?.trim() ?? existing[0].bio,
      avatarUrl: avatar_url ?? existing[0].avatarUrl,
      updatedAt: new Date(),
    }).where(eq(profilesTable.userId, userId)).returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(profilesTable).values({ userId, username: username?.trim() || null, bio: bio?.trim() || null, avatarUrl: avatar_url || null }).returning();
    res.status(201).json(created);
  }
});

export default router;
