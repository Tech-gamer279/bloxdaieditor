import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { adminsTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

/** The one true admin — set via ADMIN_USER_ID env var at deploy time. */
function getRootAdminId(): string | undefined {
  return process.env.ADMIN_USER_ID?.trim() || undefined;
}

/** Returns true only if userId matches the env-var-pinned root admin ID. */
function isRootAdmin(userId: string): boolean {
  const root = getRootAdminId();
  return !!root && userId === root;
}

async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = (req as AuthedRequest).clerkUserId;
  if (!isRootAdmin(userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  next();
}

/** GET /admin/check — tells the frontend whether the caller is the root admin. */
router.get("/admin/check", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const root = getRootAdminId();

  if (!root) {
    // Env var not set — fall back to bootstrap: first caller becomes admin
    const allAdmins = await db.select().from(adminsTable);
    if (allAdmins.length === 0) {
      await db.insert(adminsTable).values({ userId });
      res.json({ isAdmin: true, bootstrapped: true });
      return;
    }
    const isAdmin = allAdmins.some((a) => a.userId === userId);
    res.json({ isAdmin });
    return;
  }

  res.json({ isAdmin: isRootAdmin(userId) });
});

/** GET /admin/admins — list all admin records (root admin only). */
router.get("/admin/admins", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(adminsTable);
  res.json(rows);
});

/** POST /admin/grant — grant admin role (root admin only). */
router.post("/admin/grant", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { user_id } = req.body as { user_id?: string };
  if (!user_id) { res.status(400).json({ error: "Missing user_id" }); return; }
  const existing = await db.select().from(adminsTable).where(eq(adminsTable.userId, user_id));
  if (existing.length) { res.json(existing[0]); return; }
  const [admin] = await db.insert(adminsTable).values({ userId: user_id }).returning();
  res.status(201).json(admin);
});

/** DELETE /admin/revoke/:userId — revoke admin role (root admin only, cannot self-revoke). */
router.delete("/admin/revoke/:userId", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const callerId = (req as AuthedRequest).clerkUserId;
  const targetId = req.params.userId as string;
  if (targetId === callerId) { res.status(400).json({ error: "Cannot revoke your own admin" }); return; }
  await db.delete(adminsTable).where(eq(adminsTable.userId, targetId));
  res.sendStatus(204);
});

export default router;
