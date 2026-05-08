import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { profilesApi, snippetsApi } from "@/lib/demo-data";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Code2, Heart, Eye, Trophy, User } from "lucide-react";
import Header from "@/components/Header";

type Profile = { user_id: string; username: string | null; bio: string | null; avatar_url: string | null; rank_points: number };
type Snip = { id: string; title: string; likes: number; views: number; created_at: string };

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

const PublicProfile = () => {
  const { username } = useParams<{ username: string }>();
  const [, navigate] = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [snippets, setSnippets] = useState<Snip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    const p = profilesApi.getByUsername(username);
    if (p) {
      setProfile(p as Profile);
      const allSnippets = snippetsApi.getAll();
      setSnippets(allSnippets.filter(s => s.user_id === p.user_id).map(s => ({
        id: s.id, title: s.title, likes: s.likes, views: s.views, created_at: s.created_at,
      })));
    }
    setLoading(false);
  }, [username]);

  return (
    <div className="min-h-screen bg-background">
      <Header onNewSnippet={() => {}} />
      <main className="container max-w-3xl px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        {loading ? (
          <p className="text-center py-12 text-muted-foreground">Loading...</p>
        ) : !profile ? (
          <p className="text-center py-12 text-muted-foreground">User not found</p>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-24 w-24 border-2 border-primary/30">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary"><User className="h-10 w-10" /></AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground">{profile.username || "anonymous"}</h1>
                <div className="flex items-center justify-center gap-2 mt-1 text-sm">
                  <Trophy className="h-4 w-4 text-yellow-400" />
                  <span className="text-yellow-400 font-semibold">{rankTitle(profile.rank_points)}</span>
                  <span className="text-muted-foreground">- {profile.rank_points} pts</span>
                </div>
                {profile.bio && <p className="text-sm text-muted-foreground mt-3 max-w-md">{profile.bio}</p>}
              </div>
            </div>
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
                {snippets.length === 0 && <p className="text-sm text-muted-foreground">No snippets shared yet</p>}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PublicProfile;
