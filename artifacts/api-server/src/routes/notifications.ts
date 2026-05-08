import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

/** GET /notifications — fetch the caller's notifications (newest first, max 50). */
router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const rows = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.targetUserId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);
  res.json(rows);
});

/**
 * GET /notifications/unread-count — returns { count: N } for the caller.
 * IMPORTANT: must be declared BEFORE /:userId and /:id routes to avoid shadowing.
 */
router.get("/notifications/unread-count", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const rows = await db.select({ id: notificationsTable.id }).from(notificationsTable)
    .where(and(eq(notificationsTable.targetUserId, userId), eq(notificationsTable.read, false)));
  res.json({ count: rows.length });
});

/**
 * PATCH /notifications/read-all — mark all caller's notifications as read.
 * IMPORTANT: must be declared BEFORE /:id/read to avoid shadowing.
 */
router.patch("/notifications/read-all", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  await db.update(notificationsTable)
    .set({ read: true })
    .where(and(eq(notificationsTable.targetUserId, userId), eq(notificationsTable.read, false)));
  res.sendStatus(204);
});

/** PATCH /notifications/:id/read — mark a single notification as read. */
router.patch("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const id = req.params.id as string;
  const [row] = await db.select().from(notificationsTable).where(eq(notificationsTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  if (row.targetUserId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  const [updated] = await db.update(notificationsTable).set({ read: true }).where(eq(notificationsTable.id, id)).returning();
  res.json(updated);
});

/**
 * GET /notifications/:userId — spec-required alias; verifies caller owns the resource.
 * Must come AFTER all static /notifications/* routes.
 */
router.get("/notifications/:userId", requireAuth, async (req, res): Promise<void> => {
  const caller = (req as AuthedRequest).clerkUserId;
  const targetParam = req.params.userId as string;
  if (caller !== targetParam) { res.status(403).json({ error: "Forbidden" }); return; }
  const rows = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.targetUserId, caller))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);
  res.json(rows);
});

/**
 * GET /notifications/:userId/unread-count — spec-required alias with ownership check.
 * Must come AFTER /notifications/unread-count.
 */
router.get("/notifications/:userId/unread-count", requireAuth, async (req, res): Promise<void> => {
  const caller = (req as AuthedRequest).clerkUserId;
  const targetParam = req.params.userId as string;
  if (caller !== targetParam) { res.status(403).json({ error: "Forbidden" }); return; }
  const rows = await db.select({ id: notificationsTable.id }).from(notificationsTable)
    .where(and(eq(notificationsTable.targetUserId, caller), eq(notificationsTable.read, false)));
  res.json({ count: rows.length });
});

export default router;
