import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";

interface NotifyParams {
  type: string;
  actorUserId: string;
  actorName?: string | null;
  targetUserId: string;
  resourceId?: string | null;
  resourceTitle?: string | null;
}

/** Fire-and-forget notification insert. Skips if actor === target. */
export async function createNotification(params: NotifyParams): Promise<void> {
  if (params.actorUserId === params.targetUserId) return;
  await db.insert(notificationsTable).values({
    type: params.type,
    actorUserId: params.actorUserId,
    actorName: params.actorName ?? null,
    targetUserId: params.targetUserId,
    resourceId: params.resourceId ?? null,
    resourceTitle: params.resourceTitle ?? null,
  }).catch(() => {});
}
