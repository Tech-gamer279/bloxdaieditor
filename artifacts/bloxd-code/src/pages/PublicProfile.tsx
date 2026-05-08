import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { apiFetch } from "@/lib/api";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Code2, Heart, Eye, Trophy, User, Award } from "lucide-react";
import Header from "@/components/Header";

type Profile = { userId: string; username: string | null; bio: string | null; avatarUrl: string | null; rankPoints: number };
type Snip = { id: string; title: string; likes: number; views: number; createdAt: string };
type BadgeEntry = { id: string; badge: { id: string; name: string; description: string; emoji: string; color: string } };

function rankTitle(p: number) {
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

const PublicProfile = () => {
  const { username } = useParams<{ username: string }>();
  const [, navigate] = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [snippets, setSnippets] = useState<Snip[]>([]);
  const [badges, setBadges] = useState<BadgeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    apiFetch(`/profiles/by-username/${encodeURIComponent(username)}`)
      .then((data) => {
        const d = data as { profile: Profile; snippets: Snip[] };
        setProfile(d.profile);
        setSnippets(d.snippets);
        return apiFetch(`/badges/user/${d.profile.userId}`);
      })
      .then((b) => setBadges(b as BadgeEntry[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username]);

  const rank = profile ? rankTitle(profile.rankPoints) : "";

  return (
    <div className="min-h-screen bg-background">
      <Header onNewSnippet={() => {}} />
      <main className="container max-w-3xl px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        {loading ? (
          <p className="text-center py-12 text-muted-foreground animate-pulse">Loading...</p>
        ) : !profile ? (
          <p className="text-center py-12 text-muted-foreground">User not found</p>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-24 w-24 border-2 border-primary/30">
                <AvatarImage src={profile.avatarUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary"><User className="h-10 w-10" /></AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground">{profile.username || "anonymous"}</h1>
                <div className={`flex items-center justify-center gap-2 mt-1 text-sm ${RANK_COLORS[rank]}`}>
                  <Trophy className="h-4 w-4" />
                  <span className="font-semibold">{rank}</span>
                  <span className="text-muted-foreground">— {profile.rankPoints} pts</span>
                </div>
                {profile.bio && <p className="text-sm text-muted-foreground mt-3 max-w-md">{profile.bio}</p>}
              </div>
            </div>

            {/* Badges */}
            {badges.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Award className="h-4 w-4" /> Badges
                </h2>
                <div className="flex flex-wrap gap-2 justify-center">
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

            {/* Snippets */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Code2 className="h-4 w-4" /> Snippets ({snippets.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {snippets.map((s) => (
                  <div key={s.id} className="rounded-lg border border-border bg-card p-4">
                    <p className="font-medium text-foreground truncate">{s.title}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                      <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {s.likes}</span>
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {s.views}</span>
                    </div>
                  </div>
                ))}
                {snippets.length === 0 && <p className="text-sm text-muted-foreground col-span-2">No snippets shared yet</p>}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PublicProfile;
