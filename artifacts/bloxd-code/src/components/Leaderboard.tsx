import { useEffect, useState } from "react";
import { Link } from "wouter";
import { profilesApi, snippetsApi } from "@/lib/demo-data";
import { Trophy, Medal, Star, Crown, Heart, Eye } from "lucide-react";

type RankedUser = { user_id: string; username: string | null; rank_points: number };
type TopSnippet = { id: string; title: string; author_name: string; likes: number; views: number };

const RANK_CONFIG: Record<string, { color: string; icon: typeof Star }> = {
  Owner: { color: "text-red-500", icon: Crown },
  Legend: { color: "text-yellow-400", icon: Crown },
  Master: { color: "text-purple-400", icon: Trophy },
  Expert: { color: "text-blue-400", icon: Medal },
  Pro: { color: "text-emerald-400", icon: Star },
  Coder: { color: "text-cyan-400", icon: Star },
  Beginner: { color: "text-muted-foreground", icon: Star },
  Newbie: { color: "text-muted-foreground", icon: Star },
};

function getRankTitle(points: number): string {
  if (points >= 1000) return "Owner";
  if (points >= 500) return "Legend";
  if (points >= 200) return "Master";
  if (points >= 100) return "Expert";
  if (points >= 50) return "Pro";
  if (points >= 20) return "Coder";
  if (points >= 5) return "Beginner";
  return "Newbie";
}

const Leaderboard = () => {
  const [users, setUsers] = useState<RankedUser[]>([]);
  const [topSnippets, setTopSnippets] = useState<TopSnippet[]>([]);
  const [tab, setTab] = useState<"users" | "snippets">("users");

  useEffect(() => {
    const profiles = profilesApi.getTopUsers(10);
    setUsers(profiles.map(p => ({ user_id: p.user_id, username: p.username, rank_points: p.rank_points })));
    const snippets = snippetsApi.getAll().sort((a, b) => b.likes - a.likes).slice(0, 10);
    setTopSnippets(snippets.map(s => ({ id: s.id, title: s.title, author_name: s.author_name, likes: s.likes, views: s.views })));
  }, []);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex border-b border-border">
        <button onClick={() => setTab("users")} className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors ${tab === "users" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
          <Trophy className="h-3.5 w-3.5 inline mr-1.5" />Top Users
        </button>
        <button onClick={() => setTab("snippets")} className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors ${tab === "snippets" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
          <Heart className="h-3.5 w-3.5 inline mr-1.5" />Top Snippets
        </button>
      </div>

      <div className="p-3 space-y-1.5 max-h-[300px] overflow-y-auto">
        {tab === "users" ? (
          users.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No ranked users yet — share snippets to earn points!</p>
          ) : (
            users.map((u, i) => {
              const rank = getRankTitle(u.rank_points);
              const cfg = RANK_CONFIG[rank];
              const Icon = cfg.icon;
              return (
                <div key={u.user_id} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary/30 transition-colors">
                  <span className={`text-xs font-bold w-5 ${i < 3 ? "text-primary" : "text-muted-foreground"}`}>#{i + 1}</span>
                  <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <Link href={`/u/${u.username || ""}`} className="text-sm font-medium text-foreground truncate hover:text-primary block">{u.username || "Anonymous"}</Link>
                    <p className={`text-xs ${cfg.color}`}>{rank}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{u.rank_points} pts</span>
                </div>
              );
            })
          )
        ) : topSnippets.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No snippets yet — be the first to share!</p>
        ) : (
          topSnippets.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary/30 transition-colors">
              <span className={`text-xs font-bold w-5 ${i < 3 ? "text-primary" : "text-muted-foreground"}`}>#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                <p className="text-xs text-muted-foreground">@{s.author_name}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" /> {s.likes}</span>
                <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {s.views}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
