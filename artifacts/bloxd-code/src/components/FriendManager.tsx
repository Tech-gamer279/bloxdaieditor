import { useEffect, useState, useCallback } from "react";
import { useApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Search, UserPlus, UserMinus, UserCheck, X } from "lucide-react";

interface Profile {
  userId: string;
  username: string | null;
  avatarUrl: string | null;
}

interface Friend {
  requestId: string;
  friendId: string;
  addedAt: string;
  profile: Profile | null;
}

interface PendingRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: string;
  createdAt: string;
  senderProfile: Profile | null;
}

interface FriendManagerProps { userId: string }

const FriendManager = ({ userId }: FriendManagerProps) => {
  const { user } = useAuth();
  const api = useApi();
  const [query, setQuery] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [friendsData, pendingData] = await Promise.all([
        api("/friends") as Promise<Friend[]>,
        api("/friends/requests/pending") as Promise<PendingRequest[]>,
      ]);
      setFriends(friendsData);
      setPending(pendingData);
    } catch {
      toast({ title: "Failed to load friends", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, api]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSendRequest = async () => {
    const trimmed = query.trim();
    if (!trimmed) { toast({ title: "Enter a username", variant: "destructive" }); return; }
    setSending(true);
    try {
      // Lookup profile by username
      const data = await api(`/profiles/by-username/${encodeURIComponent(trimmed)}`) as { profile: Profile };
      const profile = data.profile;
      if (profile.userId === userId) {
        toast({ title: "That's you", description: "You can't add yourself.", variant: "destructive" });
        setSending(false); return;
      }
      // Send the friend request
      await api("/friends/request", {
        method: "POST",
        body: JSON.stringify({ to_user_id: profile.userId }),
      });
      setQuery("");
      toast({ title: "Friend request sent!", description: `Request sent to ${profile.username || trimmed}.` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg.includes("already pending")) {
        toast({ title: "Request already sent", description: "Waiting for them to accept." });
      } else if (msg.includes("Already friends")) {
        toast({ title: "Already friends" });
      } else if (msg.includes("Not found")) {
        toast({ title: "User not found", description: `No profile for "${trimmed}". They must set a username first.`, variant: "destructive" });
      } else {
        toast({ title: "Error", description: msg, variant: "destructive" });
      }
    }
    setSending(false);
  };

  const handleAccept = async (requestId: string) => {
    try {
      await api(`/friends/request/${requestId}/accept`, { method: "POST" });
      toast({ title: "Friend request accepted!" });
      await loadData();
    } catch {
      toast({ title: "Failed to accept request", variant: "destructive" });
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      await api(`/friends/request/${requestId}/decline`, { method: "POST" });
      setPending((prev) => prev.filter((r) => r.id !== requestId));
      toast({ title: "Request declined" });
    } catch {
      toast({ title: "Failed to decline request", variant: "destructive" });
    }
  };

  const handleRemove = async (friendId: string) => {
    try {
      await api(`/friends/${friendId}`, { method: "DELETE" });
      setFriends((prev) => prev.filter((f) => f.friendId !== friendId));
      toast({ title: "Friend removed" });
    } catch {
      toast({ title: "Failed to remove friend", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Add friend */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Friends</h2>
          <p className="text-sm text-muted-foreground">Add friends by username to keep track of your favourite collaborators.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendRequest()}
            placeholder="Search by username"
            className="min-w-[200px]"
          />
          <Button onClick={handleSendRequest} disabled={sending} size="sm">
            <UserPlus className="h-4 w-4 mr-2" />{sending ? "Sending..." : "Send Request"}
          </Button>
        </div>
      </div>

      {/* Pending incoming requests */}
      {pending.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Incoming Requests ({pending.length})</h3>
          {pending.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={r.senderProfile?.avatarUrl || undefined} />
                  <AvatarFallback>{(r.senderProfile?.username || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground text-sm">{r.senderProfile?.username || r.fromUserId}</p>
                  <p className="text-xs text-muted-foreground">Sent {new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => handleAccept(r.id)}>
                  <UserCheck className="h-4 w-4 mr-1" /> Accept
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDecline(r.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Friends list */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Your Friends ({friends.length})</h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : friends.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            <Search className="mx-auto mb-3 h-6 w-6 opacity-40" />
            No friends yet. Search by username to send a request.
          </div>
        ) : (
          friends.map((f) => (
            <div key={f.requestId} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={f.profile?.avatarUrl || undefined} />
                  <AvatarFallback>{(f.profile?.username || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground text-sm">{f.profile?.username || f.friendId}</p>
                  <p className="text-xs text-muted-foreground">Friends since {new Date(f.addedAt).toLocaleDateString()}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleRemove(f.friendId)}>
                <UserMinus className="h-4 w-4 mr-1" /> Remove
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FriendManager;
