import { Router, type IRouter } from "express";
import { eq, and, desc, lt } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  serversTable, channelsTable, serverMembersTable, messagesTable,
  messageReactionsTable, dmConversationsTable, dmMessagesTable,
  voiceParticipantsTable, reportsTable,
} from "@workspace/db";
import { randomBytes } from "crypto";
import { requireAuth, optionalAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

function makeInviteCode(): string {
  return randomBytes(4).toString("hex");
}

// ── Servers ──────────────────────────────────────────────────────────────────

router.post("/community/servers", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const { name, icon_url } = req.body as { name?: string; icon_url?: string };
  if (!name?.trim()) { res.status(400).json({ error: "Missing name" }); return; }
  const inviteCode = makeInviteCode();
  const [server] = await db.insert(serversTable).values({ name: name.trim(), iconUrl: icon_url || null, ownerId: userId, inviteCode }).returning();
  await db.insert(channelsTable).values([
    { serverId: server.id, name: "general", type: "text", position: 0 },
    { serverId: server.id, name: "announcements", type: "text", position: 1 },
    { serverId: server.id, name: "voice", type: "voice", position: 2 },
  ]);
  await db.insert(serverMembersTable).values({ serverId: server.id, userId, role: "owner" });
  res.status(201).json(server);
});

router.get("/community/servers/user/:userId", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const members = await db.select().from(serverMembersTable).where(eq(serverMembersTable.userId, userId));
  if (!members.length) { res.json([]); return; }
  const serverIds = members.map((m) => m.serverId);
  const servers = await db.select().from(serversTable);
  res.json(servers.filter((s) => serverIds.includes(s.id)));
});

router.get("/community/servers/public", async (_req, res): Promise<void> => {
  const servers = await db.select().from(serversTable).where(eq(serversTable.isPublic, true)).orderBy(desc(serversTable.createdAt)).limit(20);
  res.json(servers);
});

router.post("/community/servers/join", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const { invite_code } = req.body as { invite_code?: string };
  if (!invite_code) { res.status(400).json({ error: "Missing invite_code" }); return; }
  const [server] = await db.select().from(serversTable).where(eq(serversTable.inviteCode, invite_code));
  if (!server) { res.status(404).json({ error: "Server not found" }); return; }
  const existing = await db.select().from(serverMembersTable).where(
    and(eq(serverMembersTable.serverId, server.id), eq(serverMembersTable.userId, userId))
  );
  if (!existing.length) {
    await db.insert(serverMembersTable).values({ serverId: server.id, userId, role: "member" });
  }
  res.json(server);
});

router.post("/community/servers/:serverId/leave", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const serverId = req.params.serverId as string;
  await db.delete(serverMembersTable).where(
    and(eq(serverMembersTable.serverId, serverId), eq(serverMembersTable.userId, userId))
  );
  res.sendStatus(204);
});

router.get("/community/servers/:serverId/channels", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const serverId = req.params.serverId as string;
  const membership = await db.select().from(serverMembersTable).where(
    and(eq(serverMembersTable.serverId, serverId), eq(serverMembersTable.userId, userId))
  );
  if (!membership.length) { res.status(403).json({ error: "Not a member" }); return; }
  const channels = await db.select().from(channelsTable).where(eq(channelsTable.serverId, serverId));
  res.json(channels);
});

router.post("/community/servers/:serverId/channels", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const serverId = req.params.serverId as string;
  const membership = await db.select().from(serverMembersTable).where(
    and(eq(serverMembersTable.serverId, serverId), eq(serverMembersTable.userId, userId))
  );
  if (!membership.length || !["owner", "admin"].includes(membership[0].role)) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  const { name, type } = req.body as { name?: string; type?: string };
  if (!name?.trim()) { res.status(400).json({ error: "Missing name" }); return; }
  const existing = await db.select().from(channelsTable).where(eq(channelsTable.serverId, serverId));
  const [ch] = await db.insert(channelsTable).values({ serverId, name: name.trim(), type: (type as "text" | "voice") || "text", position: existing.length }).returning();
  res.status(201).json(ch);
});

router.get("/community/servers/:serverId/members", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const serverId = req.params.serverId as string;
  const membership = await db.select().from(serverMembersTable).where(
    and(eq(serverMembersTable.serverId, serverId), eq(serverMembersTable.userId, userId))
  );
  if (!membership.length) { res.status(403).json({ error: "Not a member" }); return; }
  const members = await db.select().from(serverMembersTable).where(eq(serverMembersTable.serverId, serverId));
  res.json(members);
});

// ── Messages ──────────────────────────────────────────────────────────────────

router.get("/community/channels/:channelId/messages", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const channelId = req.params.channelId as string;
  const [channel] = await db.select().from(channelsTable).where(eq(channelsTable.id, channelId));
  if (!channel) { res.status(404).json({ error: "Channel not found" }); return; }
  const membership = await db.select().from(serverMembersTable).where(
    and(eq(serverMembersTable.serverId, channel.serverId), eq(serverMembersTable.userId, userId))
  );
  if (!membership.length) { res.status(403).json({ error: "Not a member" }); return; }
  const { before, limit = "50" } = req.query as { before?: string; limit?: string };
  let msgs: (typeof messagesTable.$inferSelect)[];
  if (before) {
    const [ref] = await db.select().from(messagesTable).where(eq(messagesTable.id, before));
    if (ref) {
      msgs = await db.select().from(messagesTable)
        .where(and(eq(messagesTable.channelId, channelId), lt(messagesTable.createdAt, ref.createdAt)))
        .orderBy(desc(messagesTable.createdAt)).limit(parseInt(limit, 10));
    } else {
      msgs = [];
    }
  } else {
    msgs = await db.select().from(messagesTable)
      .where(eq(messagesTable.channelId, channelId))
      .orderBy(desc(messagesTable.createdAt)).limit(parseInt(limit, 10));
  }
  res.json(msgs.reverse());
});

router.post("/community/channels/:channelId/messages", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const channelId = req.params.channelId as string;
  const [channel] = await db.select().from(channelsTable).where(eq(channelsTable.id, channelId));
  if (!channel) { res.status(404).json({ error: "Channel not found" }); return; }
  const membership = await db.select().from(serverMembersTable).where(
    and(eq(serverMembersTable.serverId, channel.serverId), eq(serverMembersTable.userId, userId))
  );
  if (!membership.length) { res.status(403).json({ error: "Not a member" }); return; }
  const { author_name, content } = req.body as { author_name?: string; content?: string };
  if (!content?.trim()) { res.status(400).json({ error: "Missing content" }); return; }
  const [msg] = await db.insert(messagesTable).values({
    channelId, userId, authorName: author_name || "anonymous", content: content.trim(),
  }).returning();
  res.status(201).json(msg);
});

router.delete("/community/messages/:messageId", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const messageId = req.params.messageId as string;
  const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, messageId));
  if (!msg) { res.status(404).json({ error: "Not found" }); return; }
  if (msg.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(messagesTable).where(eq(messagesTable.id, messageId));
  res.sendStatus(204);
});

router.get("/community/messages/reactions", optionalAuth, async (req, res): Promise<void> => {
  const { ids } = req.query as { ids?: string };
  if (!ids) { res.json([]); return; }
  const idList = ids.split(",").filter(Boolean);
  const all: (typeof messageReactionsTable.$inferSelect)[] = [];
  for (const id of idList) {
    const rows = await db.select().from(messageReactionsTable).where(eq(messageReactionsTable.messageId, id));
    all.push(...rows);
  }
  res.json(all);
});

router.post("/community/messages/:messageId/reactions", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const messageId = req.params.messageId as string;
  const { emoji } = req.body as { emoji?: string };
  if (!emoji) { res.status(400).json({ error: "Missing emoji" }); return; }
  const existing = await db.select().from(messageReactionsTable).where(
    and(
      eq(messageReactionsTable.messageId, messageId),
      eq(messageReactionsTable.userId, userId),
      eq(messageReactionsTable.emoji, emoji),
    )
  );
  if (existing.length) {
    await db.delete(messageReactionsTable).where(eq(messageReactionsTable.id, existing[0].id));
    res.json({ removed: true });
  } else {
    const [r] = await db.insert(messageReactionsTable).values({ messageId, userId, emoji }).returning();
    res.status(201).json(r);
  }
});

// ── Reports ───────────────────────────────────────────────────────────────────

router.post("/community/reports", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const { target_type, target_id, target_user_id, server_id, reason } = req.body as {
    target_type?: string; target_id?: string; target_user_id?: string; server_id?: string; reason?: string;
  };
  if (!target_type || !target_id || !reason?.trim()) { res.status(400).json({ error: "Missing fields" }); return; }
  const [r] = await db.insert(reportsTable).values({
    reporterId: userId, targetType: target_type, targetId: target_id,
    targetUserId: target_user_id || null, serverId: server_id || null, reason: reason.trim(),
  }).returning();
  res.status(201).json(r);
});

// ── DMs ────────────────────────────────────────────────────────────────────────

router.get("/community/dm/:userId", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const { other_id } = req.query as { other_id?: string };
  if (!other_id) { res.status(400).json({ error: "Missing other_id" }); return; }
  const [a, b] = [userId, other_id].sort();
  let convs = await db.select().from(dmConversationsTable).where(
    and(eq(dmConversationsTable.userA, a), eq(dmConversationsTable.userB, b))
  );
  if (!convs.length) {
    const [conv] = await db.insert(dmConversationsTable).values({ userA: a, userB: b }).returning();
    convs = [conv];
  }
  res.json(convs[0]);
});

router.get("/community/dm/conversation/:conversationId/messages", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const conversationId = req.params.conversationId as string;
  const [conv] = await db.select().from(dmConversationsTable).where(eq(dmConversationsTable.id, conversationId));
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  if (conv.userA !== userId && conv.userB !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  const msgs = await db.select().from(dmMessagesTable)
    .where(eq(dmMessagesTable.conversationId, conversationId))
    .orderBy(dmMessagesTable.createdAt);
  res.json(msgs);
});

router.post("/community/dm/conversation/:conversationId/messages", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const conversationId = req.params.conversationId as string;
  const { content } = req.body as { content?: string };
  if (!content?.trim()) { res.status(400).json({ error: "Missing content" }); return; }
  const [conv] = await db.select().from(dmConversationsTable).where(eq(dmConversationsTable.id, conversationId));
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  if (conv.userA !== userId && conv.userB !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  const [msg] = await db.insert(dmMessagesTable).values({ conversationId, userId, content: content.trim() }).returning();
  res.status(201).json(msg);
});

// ── Voice ────────────────────────────────────────────────────────────────────

router.get("/community/voice/:channelId/participants", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const channelId = req.params.channelId as string;
  const [channel] = await db.select().from(channelsTable).where(eq(channelsTable.id, channelId));
  if (!channel) { res.status(404).json({ error: "Channel not found" }); return; }
  const membership = await db.select().from(serverMembersTable).where(
    and(eq(serverMembersTable.serverId, channel.serverId), eq(serverMembersTable.userId, userId))
  );
  if (!membership.length) { res.status(403).json({ error: "Not a member" }); return; }
  const participants = await db.select().from(voiceParticipantsTable).where(eq(voiceParticipantsTable.channelId, channelId));
  res.json(participants);
});

router.post("/community/voice/:channelId/join", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const channelId = req.params.channelId as string;
  const { username } = req.body as { username?: string };
  await db.delete(voiceParticipantsTable).where(
    and(eq(voiceParticipantsTable.channelId, channelId), eq(voiceParticipantsTable.userId, userId))
  );
  const [p] = await db.insert(voiceParticipantsTable).values({ channelId, userId, username: username || null }).returning();
  res.status(201).json(p);
});

router.delete("/community/voice/:channelId/leave/:userId", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).clerkUserId;
  const channelId = req.params.channelId as string;
  await db.delete(voiceParticipantsTable).where(
    and(eq(voiceParticipantsTable.channelId, channelId), eq(voiceParticipantsTable.userId, userId))
  );
  res.sendStatus(204);
});

export default router;
