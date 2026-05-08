import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Search, UserPlus, UserMinus } from "lucide-react";

type Friend = { id: string; username: string; avatar_url?: string | null; addedAt: string };
interface FriendManagerProps { userId: string }

const FriendManager = ({ userId }: FriendManagerProps) => {
  const [query, setQuery] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [adding, setAdding] = useState(false);
  const storageKey = `bloxd-friends-${userId}`;

  useEffect(() => {
    if (!userId) return;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) setFriends(JSON.parse(saved) as Friend[]);
    } catch { setFriends([]); }
  }, [storageKey, userId]);

  const persist = (next: Friend[]) => {
    setFriends(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const handleAddFriend = async () => {
    const trimmed = query.trim();
    if (!trimmed) { toast({ title: "Enter a username", variant: "destructive" }); return; }
    setAdding(true);
    try {
      const data = await apiFetch(`/profiles/by-username/${encodeURIComponent(trimmed)}`);
      const profile = (data as { profile: { userId: string; username: string | null; avatarUrl: string | null } }).profile;
      if (profile.userId === userId) {
        toast({ title: "That's you", description: "You can't add yourself as a friend.", variant: "destructive" });
        setAdding(false); return;
      }
      if (friends.some((f) => f.id === profile.userId)) {
        toast({ title: "Already added" });
        setAdding(false); return;
      }
      const newFriend: Friend = { id: profile.userId, username: profile.username || trimmed, avatar_url: profile.avatarUrl, addedAt: new Date().toISOString() };
      persist([...friends, newFriend]);
      setQuery("");
      toast({ title: "Friend added!", description: `${newFriend.username} added to your list.` });
    } catch {
      toast({ title: "User not found", description: `No profile found for "${trimmed}". They must set a username first.`, variant: "destructive" });
    }
    setAdding(false);
  };

  const removeFriend = (id: string) => {
    persist(friends.filter((f) => f.id !== id));
    toast({ title: "Friend removed" });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Friends</h2>
          <p className="text-sm text-muted-foreground">Add friends by username to keep track of your favourite collaborators.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddFriend()} placeholder="Search by username" className="min-w-[200px]" />
          <Button onClick={handleAddFriend} disabled={adding} size="sm">
            <UserPlus className="h-4 w-4 mr-2" />{adding ? "Adding..." : "Add"}
          </Button>
        </div>
      </div>
      {friends.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          <Search className="mx-auto mb-3 h-6 w-6 opacity-40" />
          No friends yet. Search by username to connect.
        </div>
      ) : (
        <div className="space-y-3">
          {friends.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={f.avatar_url || undefined} />
                  <AvatarFallback>{f.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground text-sm">{f.username}</p>
                  <p className="text-xs text-muted-foreground">Added {new Date(f.addedAt).toLocaleDateString()}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => removeFriend(f.id)}>
                <UserMinus className="h-4 w-4 mr-1" /> Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FriendManager;
