import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { adminsTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = (req as AuthedRequest).clerkUserId;
  const rows = await db.select().from(adminsTable).where(eq(adminsTable.userId, userId));
  if (!rows.length) { res.status(403).json({ error: "Forbidden" }); return; }
  next();
}

router.get("/admin/check", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const allAdmins = await db.select().from(adminsTable);
  if (allAdmins.length === 0) {
    await db.insert(adminsTable).values({ userId }).returning();
    res.json({ isAdmin: true, bootstrapped: true });
    return;
  }
  const isAdmin = allAdmins.some((a) => a.userId === userId);
  res.json({ isAdmin });
});

router.get("/admin/admins", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(adminsTable);
  res.json(rows);
});

router.post("/admin/grant", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { user_id } = req.body as { user_id?: string };
  if (!user_id) { res.status(400).json({ error: "Missing user_id" }); return; }
  const existing = await db.select().from(adminsTable).where(eq(adminsTable.userId, user_id));
  if (existing.length) { res.json(existing[0]); return; }
  const [admin] = await db.insert(adminsTable).values({ userId: user_id }).returning();
  res.status(201).json(admin);
});

router.delete("/admin/revoke/:userId", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const callerId = (req as AuthedRequest).clerkUserId;
  const targetId = req.params.userId as string;
  if (targetId === callerId) { res.status(400).json({ error: "Cannot revoke your own admin" }); return; }
  await db.delete(adminsTable).where(eq(adminsTable.userId, targetId));
  res.sendStatus(204);
});

export default router;
