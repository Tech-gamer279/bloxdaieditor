import { useEffect, useRef } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";

const TYPE_LABELS: Record<string, { emoji: string; text: (n: AppNotification) => string }> = {
  snippet_like: {
    emoji: "❤️",
    text: (n) => `${n.actorName ?? "Someone"} liked your snippet "${n.resourceTitle ?? ""}"`,
  },
  forum_reply: {
    emoji: "💬",
    text: (n) => `${n.actorName ?? "Someone"} replied to your post "${n.resourceTitle ?? ""}"`,
  },
  badge_granted: {
    emoji: "🏅",
    text: (n) => `You were awarded the "${n.resourceTitle ?? "badge"}" badge`,
  },
  friend_request: {
    emoji: "🤝",
    text: (n) => `${n.actorName ?? "Someone"} sent you a friend request`,
  },
  friend_request_accepted: {
    emoji: "✅",
    text: (n) => `${n.actorName ?? "Someone"} accepted your friend request`,
  },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const NotificationBell = () => {
  const { notifications, unreadCount, open, setOpen, openDropdown, markRead, markAllRead } = useNotifications();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, setOpen]);

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={open ? () => setOpen(false) : openDropdown}
        className="relative"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-[420px] flex flex-col rounded-xl border border-border bg-card shadow-2xl z-[100]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <span className="font-semibold text-sm text-foreground">Notifications</span>
            {notifications.some((n) => !n.read) && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm gap-2">
                <Bell className="h-7 w-7 opacity-30" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const def = TYPE_LABELS[n.type];
                return (
                  <button
                    key={n.id}
                    onClick={() => !n.read && markRead(n.id)}
                    className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-border/60 last:border-0 hover:bg-secondary/30 transition-colors ${n.read ? "opacity-60" : ""}`}
                  >
                    <span className="text-lg shrink-0 mt-0.5">{def?.emoji ?? "🔔"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">
                        {def?.text(n) ?? n.type}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && (
                      <Check className="h-3.5 w-3.5 shrink-0 mt-1 text-primary opacity-60" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
