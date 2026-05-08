import { Router, type IRouter } from "express";
import { eq, or, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { friendRequestsTable, profilesTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { createNotification } from "../lib/notify";

const router: IRouter = Router();

/** POST /friends/request — send a friend request */
router.post("/friends/request", requireAuth, async (req, res): Promise<void> => {
  const fromUserId = (req as AuthedRequest).clerkUserId;
  const { to_user_id } = req.body as { to_user_id?: string };
  if (!to_user_id) { res.status(400).json({ error: "to_user_id required" }); return; }
  if (to_user_id === fromUserId) { res.status(400).json({ error: "Cannot send request to yourself" }); return; }

  // Check for any existing request in either direction
  const existing = await db.select().from(friendRequestsTable).where(
    or(
      and(eq(friendRequestsTable.fromUserId, fromUserId), eq(friendRequestsTable.toUserId, to_user_id)),
      and(eq(friendRequestsTable.fromUserId, to_user_id), eq(friendRequestsTable.toUserId, fromUserId))
    )
  );
  if (existing.length) {
    const ex = existing[0];
    if (ex.status === "accepted") { res.status(409).json({ error: "Already friends" }); return; }
    if (ex.status === "pending") { res.status(409).json({ error: "Request already pending" }); return; }
    // declined — allow re-send by updating
    await db.update(friendRequestsTable)
      .set({ status: "pending", fromUserId, toUserId: to_user_id, updatedAt: new Date() })
      .where(eq(friendRequestsTable.id, ex.id));
    const [updated] = await db.select().from(friendRequestsTable).where(eq(friendRequestsTable.id, ex.id));
    // Notify recipient
    const [sender] = await db.select().from(profilesTable).where(eq(profilesTable.userId, fromUserId));
    await createNotification({
      type: "friend_request",
      actorUserId: fromUserId,
      actorName: sender?.username ?? null,
      targetUserId: to_user_id,
      resourceId: updated.id,
    });
    res.status(201).json(updated);
    return;
  }

  const [request] = await db.insert(friendRequestsTable)
    .values({ fromUserId, toUserId: to_user_id })
    .returning();

  // Notify recipient
  const [sender] = await db.select().from(profilesTable).where(eq(profilesTable.userId, fromUserId));
  await createNotification({
    type: "friend_request",
    actorUserId: fromUserId,
    actorName: sender?.username ?? null,
    targetUserId: to_user_id,
    resourceId: request.id,
  });

  res.status(201).json(request);
});

/** POST /friends/request/:id/accept — accept a pending friend request */
router.post("/friends/request/:id/accept", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const id = req.params.id as string;
  const [request] = await db.select().from(friendRequestsTable).where(eq(friendRequestsTable.id, id));
  if (!request) { res.status(404).json({ error: "Not found" }); return; }
  if (request.toUserId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (request.status !== "pending") { res.status(409).json({ error: "Request is not pending" }); return; }

  const [updated] = await db.update(friendRequestsTable)
    .set({ status: "accepted", updatedAt: new Date() })
    .where(eq(friendRequestsTable.id, id))
    .returning();

  // Notify the original sender that their request was accepted
  const [accepter] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
  await createNotification({
    type: "friend_request_accepted",
    actorUserId: userId,
    actorName: accepter?.username ?? null,
    targetUserId: request.fromUserId,
    resourceId: id,
  });

  res.json(updated);
});

/** POST /friends/request/:id/decline — decline a pending friend request */
router.post("/friends/request/:id/decline", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const id = req.params.id as string;
  const [request] = await db.select().from(friendRequestsTable).where(eq(friendRequestsTable.id, id));
  if (!request) { res.status(404).json({ error: "Not found" }); return; }
  if (request.toUserId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (request.status !== "pending") { res.status(409).json({ error: "Request is not pending" }); return; }

  const [updated] = await db.update(friendRequestsTable)
    .set({ status: "declined", updatedAt: new Date() })
    .where(eq(friendRequestsTable.id, id))
    .returning();

  res.json(updated);
});

/** GET /friends/requests/pending — incoming pending requests for the caller */
router.get("/friends/requests/pending", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const requests = await db.select().from(friendRequestsTable).where(
    and(eq(friendRequestsTable.toUserId, userId), eq(friendRequestsTable.status, "pending"))
  );
  // Enrich with sender profile
  const enriched = await Promise.all(requests.map(async (r) => {
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, r.fromUserId));
    return { ...r, senderProfile: profile ?? null };
  }));
  res.json(enriched);
});

/** GET /friends — accepted friends for the caller */
router.get("/friends", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const accepted = await db.select().from(friendRequestsTable).where(
    and(
      or(eq(friendRequestsTable.fromUserId, userId), eq(friendRequestsTable.toUserId, userId)),
      eq(friendRequestsTable.status, "accepted")
    )
  );
  const enriched = await Promise.all(accepted.map(async (r) => {
    const friendId = r.fromUserId === userId ? r.toUserId : r.fromUserId;
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, friendId));
    return { requestId: r.id, addedAt: r.updatedAt, friendId, profile: profile ?? null };
  }));
  res.json(enriched);
});

/** DELETE /friends/:friendUserId — remove a friend (delete the accepted request) */
router.delete("/friends/:friendUserId", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const friendUserId = req.params.friendUserId as string;
  await db.delete(friendRequestsTable).where(
    and(
      or(
        and(eq(friendRequestsTable.fromUserId, userId), eq(friendRequestsTable.toUserId, friendUserId)),
        and(eq(friendRequestsTable.fromUserId, friendUserId), eq(friendRequestsTable.toUserId, userId))
      ),
      eq(friendRequestsTable.status, "accepted")
    )
  );
  res.sendStatus(204);
});

export default router;
