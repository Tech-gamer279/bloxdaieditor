import { useEffect, useState } from "react";
import { profilesApi } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Search, UserPlus, UserMinus } from "lucide-react";

type Friend = {
  id: string;
  username: string;
  avatar_url?: string | null;
  addedAt: string;
};

interface FriendManagerProps {
  userId: string;
}

const FriendManager = ({ userId }: FriendManagerProps) => {
  const [query, setQuery] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [adding, setAdding] = useState(false);
  const storageKey = `bloxdaieditor-friends-${userId}`;

  useEffect(() => {
    if (!userId) return;
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      try {
        setFriends(JSON.parse(saved) as Friend[]);
      } catch {
        setFriends([]);
      }
    }
  }, [storageKey, userId]);

  const persist = (nextFriends: Friend[]) => {
    setFriends(nextFriends);
    window.localStorage.setItem(storageKey, JSON.stringify(nextFriends));
  };

  const handleAddFriend = () => {
    const trimmed = query.trim();
    if (!trimmed) {
      toast({ title: "Enter a username", description: "Search by username to add a friend.", variant: "destructive" });
      return;
    }
    setAdding(true);

    // Search in demo profiles
    const profile = profilesApi.getByUsername(trimmed);
    
    if (!profile) {
      // In demo mode, create a placeholder friend if not found
      const newFriend: Friend = {
        id: Math.random().toString(36).substring(2),
        username: trimmed,
        avatar_url: null,
        addedAt: new Date().toISOString(),
      };
      
      if (friends.some((friend) => friend.username.toLowerCase() === trimmed.toLowerCase())) {
        toast({ title: "Already added", description: `${trimmed} is already a friend.` });
        setAdding(false);
        return;
      }
      
      persist([...friends, newFriend]);
      setQuery("");
      toast({ title: "Friend added", description: `${trimmed} added to your friends list.` });
      setAdding(false);
      return;
    }

    if (profile.user_id === userId) {
      toast({ title: "That's you", description: "You can't add yourself as a friend.", variant: "destructive" });
      setAdding(false);
      return;
    }

    if (friends.some((friend) => friend.id === profile.user_id)) {
      toast({ title: "Already added", description: `${profile.username || "This user"} is already a friend.` });
      setAdding(false);
      return;
    }

    persist([
      ...friends,
      {
        id: profile.user_id,
        username: profile.username || "Unnamed",
        avatar_url: profile.avatar_url,
        addedAt: new Date().toISOString(),
      },
    ]);
    setQuery("");
    toast({ title: "Friend added", description: `You can now see ${profile.username || "this friend"} in your list.` });
    setAdding(false);
  };

  const removeFriend = (id: string) => {
    persist(friends.filter((friend) => friend.id !== id));
    toast({ title: "Friend removed", description: "You removed this friend from your list." });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Friends</h2>
          <p className="text-sm text-muted-foreground">
            Add friends by username and keep track of your favorite collaborators.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddFriend()}
            placeholder="Search by username"
            className="min-w-[220px]"
          />
          <Button onClick={handleAddFriend} disabled={adding} size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            {adding ? "Adding..." : "Add Friend"}
          </Button>
        </div>
      </div>

      {friends.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          <Search className="mx-auto mb-3 h-6 w-6" />
          No friends yet. Search a username to connect.
        </div>
      ) : (
        <div className="space-y-3">
          {friends.map((friend) => (
            <div key={friend.id} className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11">
                  {friend.avatar_url ? (
                    <AvatarImage src={friend.avatar_url} />
                  ) : (
                    <AvatarFallback>{friend.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{friend.username}</p>
                  <p className="text-xs text-muted-foreground">Added {new Date(friend.addedAt).toLocaleDateString()}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => removeFriend(friend.id)}>
                <UserMinus className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FriendManager;
