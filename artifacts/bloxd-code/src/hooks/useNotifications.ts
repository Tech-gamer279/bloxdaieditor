import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export interface AppNotification {
  id: string;
  type: string;
  actorUserId: string;
  actorName: string | null;
  targetUserId: string;
  resourceId: string | null;
  resourceTitle: string | null;
  read: boolean;
  createdAt: string;
}

const POLL_MS = 15_000;

export function useNotifications() {
  const { user } = useAuth();
  const api = useApi();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api("/notifications/unread-count") as { count: number };
      setUnreadCount(data.count);
    } catch {}
  }, [user]);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api("/notifications") as AppNotification[];
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    } catch {}
  }, [user]);

  useEffect(() => {
    if (!user) { setNotifications([]); setUnreadCount(0); return; }
    fetchUnread();
    timerRef.current = setInterval(fetchUnread, POLL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [user, fetchUnread]);

  const openDropdown = useCallback(async () => {
    setOpen(true);
    await fetchAll();
  }, [fetchAll]);

  const markRead = useCallback(async (id: string) => {
    try {
      await api(`/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  }, [api]);

  const markAllRead = useCallback(async () => {
    try {
      await api("/notifications/read-all", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  }, [api]);

  return { notifications, unreadCount, open, setOpen, openDropdown, markRead, markAllRead };
}
