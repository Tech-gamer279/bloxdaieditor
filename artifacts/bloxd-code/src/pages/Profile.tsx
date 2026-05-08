import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FriendManager from "@/components/FriendManager";
import {
  ArrowLeft, Save, Code2, Heart, Eye, Trophy, User, Award,
} from "lucide-react";
import {
  useGetProfile,
  useUpsertProfile,
  getGetProfileQueryKey,
} from "@workspace/api-client-react";
import { apiFetch } from "@/lib/api";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

type BadgeEntry = { id: string; userId: string; badgeId: string; grantedAt: string; badge: { id: string; name: string; description: string; emoji: string; color: string } };

function getRankTitle(p: number) {
  if (p >= 1000) return "Owner";
  if (p >= 500) return "Legend";
  if (p >= 200) return "Master";
  if (p >= 100) return "Expert";
  if (p >= 50) return "Pro";
  if (p >= 20) return "Coder";
  if (p >= 5) return "Beginner";
  return "Newbie";
}

const RANK_COLORS: Record<string, string> = {
  Owner: "text-red-500", Legend: "text-yellow-400", Master: "text-purple-400",
  Expert: "text-blue-400", Pro: "text-emerald-400", Coder: "text-cyan-400",
  Beginner: "text-muted-foreground", Newbie: "text-muted-foreground",
};

const ProfilePage = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [badges, setBadges] = useState<BadgeEntry[]>([]);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  const { data, isLoading } = useGetProfile(user?.id ?? "", {
    query: { enabled: !!user?.id, queryKey: getGetProfileQueryKey(user?.id ?? "") },
  });

  const profile = data?.profile ?? null;
  const snippets = data?.snippets ?? [];

  useEffect(() => {
    if (profile) {
      setUsername(profile.username ?? user?.username ?? "");
      setBio(profile.bio ?? "");
    } else if (user) {
      setUsername(user.username ?? "");
    }
  }, [profile, user]);

  useEffect(() => {
    if (!user) return;
    apiFetch(`/badges/user/${user.id}`)
      .then((b) => setBadges(b as BadgeEntry[]))
      .catch(() => {});
  }, [user]);

  const upsertMutation = useUpsertProfile({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetProfileQueryKey(user!.id) });
        toast({ title: "Saved", description: "Profile updated successfully" });
      },
      onError: (err) => {
        toast({ title: "Failed", description: err.message, variant: "destructive" });
      },
    },
  });

  useEffect(() => {
    if (!user) { navigate("/sign-in"); }
  }, [user, navigate]);

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  const rankPoints = profile?.rankPoints ?? 0;
  const rank = getRankTitle(rankPoints);
  const rankColor = RANK_COLORS[rank];
  const totalLikes = snippets.reduce((sum, s) => sum + s.likes, 0);
  const totalViews = snippets.reduce((sum, s) => sum + s.views, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center h-14 px-4 gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          <h1 className="text-lg font-bold text-foreground">My Profile</h1>
        </div>
      </header>

      <main className="container px-4 py-8 max-w-2xl mx-auto space-y-6">
        <div className="flex flex-col items-center gap-4">
          <Avatar className="h-24 w-24 border-2 border-primary/30">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-2xl"><User className="h-10 w-10" /></AvatarFallback>
          </Avatar>
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{profile?.username || user.username}</p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <Trophy className={`h-4 w-4 ${rankColor}`} />
              <span className={`text-sm font-semibold ${rankColor}`}>{rank}</span>
              <span className="text-xs text-muted-foreground">— {rankPoints} pts</span>
            </div>
          </div>
        </div>

        {badges.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Award className="h-4 w-4" /> Badges
            </h2>
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <div
                  key={b.id}
                  title={b.badge.description}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium"
                  style={{ borderColor: b.badge.color + "55", backgroundColor: b.badge.color + "15", color: b.badge.color }}
                >
                  <span>{b.badge.emoji}</span>
                  <span>{b.badge.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Code2, label: "Snippets", value: snippets.length, color: "text-primary" },
            { icon: Heart, label: "Likes", value: totalLikes, color: "text-red-400" },
            { icon: Eye, label: "Views", value: totalViews, color: "text-blue-400" },
            { icon: Trophy, label: "Points", value: rankPoints, color: "text-yellow-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-4 text-center">
              <s.icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <FriendManager userId={user.id} />

        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Edit Profile</h2>
          <p className="text-xs text-muted-foreground">Note: your avatar comes from your sign-in account (Google/GitHub/Microsoft).</p>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Username</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Your display name" maxLength={30} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Bio</label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." maxLength={200} rows={3} />
            <p className="text-xs text-muted-foreground text-right">{bio.length}/200</p>
          </div>
          <Button onClick={() => upsertMutation.mutate({ data: { username, bio } })} disabled={upsertMutation.isPending} className="w-full">
            <Save className="h-4 w-4 mr-2" />{upsertMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
