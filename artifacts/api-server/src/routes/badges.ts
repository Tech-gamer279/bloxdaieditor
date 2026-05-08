import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { badgesTable, userBadgesTable, adminsTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function isAdmin(userId: string): Promise<boolean> {
  const rows = await db.select().from(adminsTable).where(eq(adminsTable.userId, userId));
  return rows.length > 0;
}

// Get all badge definitions
router.get("/badges", async (_req, res): Promise<void> => {
  const badges = await db.select().from(badgesTable);
  res.json(badges);
});

// Create a new badge (admin only)
router.post("/badges", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Admin required" }); return; }
  const { name, description, emoji, color } = req.body as { name?: string; description?: string; emoji?: string; color?: string };
  if (!name?.trim() || !description?.trim()) { res.status(400).json({ error: "name and description required" }); return; }
  try {
    const [badge] = await db.insert(badgesTable).values({
      name: name.trim(), description: description.trim(),
      emoji: emoji?.trim() || "🏅", color: color?.trim() || "#6366f1",
    }).returning();
    res.status(201).json(badge);
  } catch {
    res.status(409).json({ error: "Badge name already exists" });
  }
});

// Update badge (admin only)
router.put("/badges/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Admin required" }); return; }
  const id = req.params.id as string;
  const { name, description, emoji, color } = req.body as { name?: string; description?: string; emoji?: string; color?: string };
  const updates: Record<string, string> = {};
  if (name?.trim()) updates.name = name.trim();
  if (description?.trim()) updates.description = description.trim();
  if (emoji?.trim()) updates.emoji = emoji.trim();
  if (color?.trim()) updates.color = color.trim();
  const [badge] = await db.update(badgesTable).set(updates).where(eq(badgesTable.id, id)).returning();
  if (!badge) { res.status(404).json({ error: "Not found" }); return; }
  res.json(badge);
});

// Delete a badge (admin only)
router.delete("/badges/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Admin required" }); return; }
  const id = req.params.id as string;
  await db.delete(badgesTable).where(eq(badgesTable.id, id));
  res.sendStatus(204);
});

// Get all badges for a user (with badge details)
router.get("/badges/user/:userId", async (req, res): Promise<void> => {
  const targetUserId = req.params.userId as string;
  const userBadges = await db.select().from(userBadgesTable).where(eq(userBadgesTable.userId, targetUserId));
  if (!userBadges.length) { res.json([]); return; }
  const badges = await db.select().from(badgesTable);
  const badgeMap = new Map(badges.map((b) => [b.id, b]));
  res.json(userBadges.map((ub) => ({ ...ub, badge: badgeMap.get(ub.badgeId) })).filter((ub) => ub.badge));
});

// Grant a badge to a user (admin only)
router.post("/badges/grant", requireAuth, async (req, res): Promise<void> => {
  const grantedBy = (req as AuthedRequest).clerkUserId;
  if (!(await isAdmin(grantedBy))) { res.status(403).json({ error: "Admin required" }); return; }
  const { user_id, badge_id } = req.body as { user_id?: string; badge_id?: string };
  if (!user_id || !badge_id) { res.status(400).json({ error: "user_id and badge_id required" }); return; }
  const existing = await db.select().from(userBadgesTable).where(
    and(eq(userBadgesTable.userId, user_id), eq(userBadgesTable.badgeId, badge_id))
  );
  if (existing.length) { res.status(409).json({ error: "User already has this badge" }); return; }
  const [ub] = await db.insert(userBadgesTable).values({ userId: user_id, badgeId: badge_id, grantedBy }).returning();
  res.status(201).json(ub);
});

// Revoke a badge from a user (admin only)
router.delete("/badges/revoke/:userBadgeId", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Admin required" }); return; }
  const id = req.params.userBadgeId as string;
  await db.delete(userBadgesTable).where(eq(userBadgesTable.id, id));
  res.sendStatus(204);
});

export default router;
