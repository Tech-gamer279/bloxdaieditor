import { Router, type IRouter } from "express";
import { eq, and, desc, lt, gt } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  serversTable,
  channelsTable,
  serverMembersTable,
  messagesTable,
  messageReactionsTable,
  dmConversationsTable,
  dmMessagesTable,
  voiceParticipantsTable,
  reportsTable,
} from "@workspace/db";
import { randomBytes } from "crypto";

const router: IRouter = Router();

function makeInviteCode(): string {
  return randomBytes(4).toString("hex");
}

router.post("/community/servers", async (req, res): Promise<void> => {
  const { name, icon_url, owner_id, owner_username } = req.body;
  if (!name || !owner_id) { res.status(400).json({ error: "Missing name or owner_id" }); return; }
  const inviteCode = makeInviteCode();
  const [server] = await db.insert(serversTable).values({ name, iconUrl: icon_url || null, ownerId: owner_id, inviteCode }).returning();
  await db.insert(channelsTable).values([
    { serverId: server.id, name: "general", type: "text", position: 0 },
    { serverId: server.id, name: "announcements", type: "text", position: 1 },
    { serverId: server.id, name: "Voice Chat", type: "voice", position: 2 },
  ]);
  await db.insert(serverMembersTable).values({ serverId: server.id, userId: owner_id, role: "owner", username: owner_username || null });
  res.status(201).json(server);
});

router.get("/community/servers/user/:userId", async (req, res): Promise<void> => {
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
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

router.post("/community/servers/join", async (req, res): Promise<void> => {
  const { invite_code, user_id, username } = req.body;
  if (!invite_code || !user_id) { res.status(400).json({ error: "Missing invite_code or user_id" }); return; }
  const [server] = await db.select().from(serversTable).where(eq(serversTable.inviteCode, invite_code));
  if (!server) { res.status(404).json({ error: "Server not found" }); return; }
  const existing = await db.select().from(serverMembersTable).where(and(eq(serverMembersTable.serverId, server.id), eq(serverMembersTable.userId, user_id)));
  if (existing.length) { res.json(server); return; }
  await db.insert(serverMembersTable).values({ serverId: server.id, userId: user_id, role: "member", username: username || null });
  res.json(server);
});

router.post("/community/servers/:serverId/leave", async (req, res): Promise<void> => {
  const serverId = Array.isArray(req.params.serverId) ? req.params.serverId[0] : req.params.serverId;
  const { user_id } = req.body;
  await db.delete(serverMembersTable).where(and(eq(serverMembersTable.serverId, serverId), eq(serverMembersTable.userId, user_id)));
  res.sendStatus(204);
});

router.get("/community/servers/:serverId/channels", async (req, res): Promise<void> => {
  const serverId = Array.isArray(req.params.serverId) ? req.params.serverId[0] : req.params.serverId;
  const channels = await db.select().from(channelsTable).where(eq(channelsTable.serverId, serverId));
  res.json(channels);
});

router.post("/community/servers/:serverId/channels", async (req, res): Promise<void> => {
  const serverId = Array.isArray(req.params.serverId) ? req.params.serverId[0] : req.params.serverId;
  const { name, type } = req.body;
  if (!name) { res.status(400).json({ error: "Missing name" }); return; }
  const existing = await db.select().from(channelsTable).where(eq(channelsTable.serverId, serverId));
  const [ch] = await db.insert(channelsTable).values({ serverId, name, type: type || "text", position: existing.length }).returning();
  res.status(201).json(ch);
});

router.get("/community/servers/:serverId/members", async (req, res): Promise<void> => {
  const serverId = Array.isArray(req.params.serverId) ? req.params.serverId[0] : req.params.serverId;
  const members = await db.select().from(serverMembersTable).where(eq(serverMembersTable.serverId, serverId));
  res.json(members);
});

router.get("/community/channels/:channelId/messages", async (req, res): Promise<void> => {
  const channelId = Array.isArray(req.params.channelId) ? req.params.channelId[0] : req.params.channelId;
  const { before, limit = "50" } = req.query as { before?: string; limit?: string };
  let query = db.select().from(messagesTable).where(eq(messagesTable.channelId, channelId)).$dynamic();
  if (before) {
    const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, before));
    if (msg) query = query.where(and(eq(messagesTable.channelId, channelId), lt(messagesTable.createdAt, msg.createdAt)));
  }
  const msgs = await query.orderBy(desc(messagesTable.createdAt)).limit(parseInt(limit, 10));
  res.json(msgs.reverse());
});

router.post("/community/channels/:channelId/messages", async (req, res): Promise<void> => {
  const channelId = Array.isArray(req.params.channelId) ? req.params.channelId[0] : req.params.channelId;
  const { user_id, author_name, content, attachment_url, attachment_name, attachment_type } = req.body;
  if (!user_id || content == null) { res.status(400).json({ error: "Missing user_id or content" }); return; }
  const [msg] = await db.insert(messagesTable).values({ channelId, userId: user_id, authorName: author_name || "anonymous", content, attachmentUrl: attachment_url || null, attachmentName: attachment_name || null, attachmentType: attachment_type || null }).returning();
  res.status(201).json(msg);
});

router.delete("/community/messages/:messageId", async (req, res): Promise<void> => {
  const messageId = Array.isArray(req.params.messageId) ? req.params.messageId[0] : req.params.messageId;
  await db.delete(messagesTable).where(eq(messagesTable.id, messageId));
  res.sendStatus(204);
});

router.get("/community/messages/reactions", async (req, res): Promise<void> => {
  const { ids } = req.query as { ids?: string };
  if (!ids) { res.json([]); return; }
  const idList = ids.split(",").filter(Boolean);
  if (!idList.length) { res.json([]); return; }
  const all: typeof messageReactionsTable.$inferSelect[] = [];
  for (const id of idList) {
    const rows = await db.select().from(messageReactionsTable).where(eq(messageReactionsTable.messageId, id));
    all.push(...rows);
  }
  res.json(all);
});

router.post("/community/messages/:messageId/reactions", async (req, res): Promise<void> => {
  const messageId = Array.isArray(req.params.messageId) ? req.params.messageId[0] : req.params.messageId;
  const { user_id, emoji } = req.body;
  const existing = await db.select().from(messageReactionsTable).where(and(eq(messageReactionsTable.messageId, messageId), eq(messageReactionsTable.userId, user_id), eq(messageReactionsTable.emoji, emoji)));
  if (existing.length) {
    await db.delete(messageReactionsTable).where(eq(messageReactionsTable.id, existing[0].id));
    res.json({ removed: true });
  } else {
    const [r] = await db.insert(messageReactionsTable).values({ messageId, userId: user_id, emoji }).returning();
    res.status(201).json(r);
  }
});

router.post("/community/reports", async (req, res): Promise<void> => {
  const { reporter_id, target_type, target_id, target_user_id, server_id, reason } = req.body;
  if (!reporter_id || !target_type || !target_id || !reason) { res.status(400).json({ error: "Missing fields" }); return; }
  const [r] = await db.insert(reportsTable).values({ reporterId: reporter_id, targetType: target_type, targetId: target_id, targetUserId: target_user_id || null, serverId: server_id || null, reason }).returning();
  res.status(201).json(r);
});

router.get("/community/dm/:userId", async (req, res): Promise<void> => {
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const { other_id } = req.query as { other_id?: string };
  if (!other_id) { res.status(400).json({ error: "Missing other_id" }); return; }
  const [a, b] = [userId, other_id].sort();
  let convs = await db.select().from(dmConversationsTable).where(and(eq(dmConversationsTable.userA, a), eq(dmConversationsTable.userB, b)));
  if (!convs.length) {
    const [conv] = await db.insert(dmConversationsTable).values({ userA: a, userB: b }).returning();
    convs = [conv];
  }
  res.json(convs[0]);
});

router.get("/community/dm/conversation/:conversationId/messages", async (req, res): Promise<void> => {
  const conversationId = Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId;
  const msgs = await db.select().from(dmMessagesTable).where(eq(dmMessagesTable.conversationId, conversationId)).orderBy(dmMessagesTable.createdAt);
  res.json(msgs);
});

router.post("/community/dm/conversation/:conversationId/messages", async (req, res): Promise<void> => {
  const conversationId = Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId;
  const { user_id, content } = req.body;
  if (!user_id || !content) { res.status(400).json({ error: "Missing user_id or content" }); return; }
  const [msg] = await db.insert(dmMessagesTable).values({ conversationId, userId: user_id, content }).returning();
  res.status(201).json(msg);
});

router.get("/community/voice/:channelId/participants", async (req, res): Promise<void> => {
  const channelId = Array.isArray(req.params.channelId) ? req.params.channelId[0] : req.params.channelId;
  const participants = await db.select().from(voiceParticipantsTable).where(eq(voiceParticipantsTable.channelId, channelId));
  res.json(participants);
});

router.post("/community/voice/:channelId/join", async (req, res): Promise<void> => {
  const channelId = Array.isArray(req.params.channelId) ? req.params.channelId[0] : req.params.channelId;
  const { user_id, username } = req.body;
  if (!user_id) { res.status(400).json({ error: "Missing user_id" }); return; }
  await db.delete(voiceParticipantsTable).where(and(eq(voiceParticipantsTable.channelId, channelId), eq(voiceParticipantsTable.userId, user_id)));
  const [p] = await db.insert(voiceParticipantsTable).values({ channelId, userId: user_id, username: username || null }).returning();
  res.status(201).json(p);
});

router.delete("/community/voice/:channelId/leave/:userId", async (req, res): Promise<void> => {
  const channelId = Array.isArray(req.params.channelId) ? req.params.channelId[0] : req.params.channelId;
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  await db.delete(voiceParticipantsTable).where(and(eq(voiceParticipantsTable.channelId, channelId), eq(voiceParticipantsTable.userId, userId)));
  res.sendStatus(204);
});

export default router;
