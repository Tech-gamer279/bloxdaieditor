import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { adminsTable } from "@workspace/db";

const router: IRouter = Router();

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.clerkUserId = auth.userId;
  next();
};

const requireAdmin = async (req: any, res: any, next: any) => {
  const userId = req.clerkUserId;
  const rows = await db.select().from(adminsTable).where(eq(adminsTable.userId, userId));
  if (!rows.length) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
};

router.get("/admin/check", requireAuth, async (req: any, res): Promise<void> => {
  const userId = req.clerkUserId;
  const allAdmins = await db.select().from(adminsTable);

  if (allAdmins.length === 0) {
    const [admin] = await db.insert(adminsTable).values({ userId }).returning();
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

router.post("/admin/grant", requireAuth, requireAdmin, async (req: any, res): Promise<void> => {
  const { user_id } = req.body;
  if (!user_id) { res.status(400).json({ error: "Missing user_id" }); return; }
  const existing = await db.select().from(adminsTable).where(eq(adminsTable.userId, user_id));
  if (existing.length) { res.json(existing[0]); return; }
  const [admin] = await db.insert(adminsTable).values({ userId: user_id }).returning();
  res.status(201).json(admin);
});

router.delete("/admin/revoke/:userId", requireAuth, requireAdmin, async (req: any, res): Promise<void> => {
  const targetId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  if (targetId === req.clerkUserId) {
    res.status(400).json({ error: "Cannot revoke your own admin" });
    return;
  }
  await db.delete(adminsTable).where(eq(adminsTable.userId, targetId));
  res.sendStatus(204);
});

export default router;
