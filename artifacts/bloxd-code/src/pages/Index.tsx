import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import SnippetCard from "@/components/SnippetCard";
import type { Snippet } from "@/components/SnippetCard";
import SnippetView from "@/components/SnippetView";
import NewSnippetDialog from "@/components/NewSnippetDialog";
import AiChat from "@/components/AiChat";
import Leaderboard from "@/components/Leaderboard";
import Forum from "@/components/Forum";
import Community from "@/components/community/Community";
import Schematics from "@/components/Schematics";
import Mods from "@/components/Mods";
import {
  Code2, Sparkles, Trophy, MessageSquare, Users, ImagePlus,
  UserPlus, BookOpen, MapPin, Puzzle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useApi, apiFetch } from "@/lib/api";
import MediaUpload from "@/components/MediaUpload";
import FriendManager from "@/components/FriendManager";
import UpdateLog from "@/components/UpdateLog";
import { toast } from "@/hooks/use-toast";

type Tab = "snippets" | "ai" | "ranks" | "forum" | "community" | "media" | "friends" | "update-log" | "schematics" | "mods";

type RawSnippet = {
  id: string; title: string; code: string; authorName: string; userId: string;
  likes: number; views: number; createdAt: string; liked: boolean;
};

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { id: "snippets",    label: "Code Snippets",  icon: Code2,         color: "primary" },
  { id: "ai",         label: "AI Coder",        icon: Sparkles,      color: "accent" },
  { id: "community",  label: "Community",       icon: Users,         color: "pink-400" },
  { id: "forum",      label: "Forum",           icon: MessageSquare, color: "emerald-400" },
  { id: "schematics", label: "Schematics",      icon: MapPin,        color: "sky-400" },
  { id: "mods",       label: "Mods",            icon: Puzzle,        color: "violet-400" },
  { id: "media",      label: "Media",           icon: ImagePlus,     color: "sky-400" },
  { id: "friends",    label: "Friends",         icon: UserPlus,      color: "violet-400" },
  { id: "update-log", label: "Update Log",      icon: BookOpen,      color: "amber-400" },
  { id: "ranks",      label: "Ranks",           icon: Trophy,        color: "yellow-400" },
];

const Index = () => {
  const { user } = useAuth();
  const api = useApi();
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("snippets");

  const fetchSnippets = useCallback(async () => {
    try {
      const data = await apiFetch("/snippets") as RawSnippet[];
      setSnippets(data.map((s) => ({
        id: s.id,
        title: s.title,
        code: s.code,
        author: s.authorName,
        likes: s.likes,
        views: s.views,
        createdAt: s.createdAt,
        userId: s.userId,
        liked: s.liked,
      })));
    } catch {}
  }, []);

  useEffect(() => { fetchSnippets(); }, [fetchSnippets]);

  const handleNewSnippet = async (snippet: Snippet) => {
    if (!user) {
      toast({ title: "Sign in required", description: "You need to sign in to share snippets", variant: "destructive" });
      return;
    }
    try {
      const created = await api("/snippets", {
        method: "POST",
        body: JSON.stringify({ title: snippet.title, code: snippet.code }),
      }) as RawSnippet;
      setSnippets((prev) => [{
        id: created.id, title: created.title, code: created.code,
        author: created.authorName, likes: 0, views: 0,
        createdAt: created.createdAt, userId: created.userId, liked: false,
      }, ...prev]);
      toast({ title: "Snippet shared!", description: "Your code has been shared with the community" });
    } catch (e: unknown) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = (id: string) => {
    setSnippets((prev) => prev.filter((s) => s.id !== id));
    if (selectedSnippet?.id === id) setSelectedSnippet(null);
  };

  const handleLikeChange = (id: string, liked: boolean, newCount: number) => {
    setSnippets((prev) => prev.map((s) => s.id === id ? { ...s, liked, likes: newCount } : s));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onNewSnippet={() => setShowNewDialog(true)} />

      <main className="container px-4 py-6">
        {/* Tab bar */}
        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map(({ id, label, icon: Icon, color }) => {
            const active = activeTab === id;
            const colorMap: Record<string, string> = {
              "primary":     "bg-primary/15 text-primary border border-primary/30",
              "accent":      "bg-accent/15 text-accent border border-accent/30",
              "pink-400":    "bg-pink-500/15 text-pink-400 border border-pink-500/30",
              "emerald-400": "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
              "sky-400":     "bg-sky-500/15 text-sky-400 border border-sky-500/30",
              "violet-400":  "bg-violet-500/15 text-violet-400 border border-violet-500/30",
              "amber-400":   "bg-amber-500/15 text-amber-400 border border-amber-500/30",
              "yellow-400":  "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
            };
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${active ? colorMap[color] : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === "community" ? (
          <Community />
        ) : activeTab === "schematics" ? (
          <Schematics />
        ) : activeTab === "mods" ? (
          <Mods />
        ) : activeTab === "media" ? (
          <div className="grid grid-cols-1 gap-6">
            {user ? <MediaUpload userId={user.id} /> : (
              <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">Sign in to upload media and manage your files.</div>
            )}
          </div>
        ) : activeTab === "friends" ? (
          <div className="grid grid-cols-1 gap-6">
            {user ? <FriendManager userId={user.id} /> : (
              <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">Sign in to add friends and manage your friend list.</div>
            )}
          </div>
        ) : activeTab === "update-log" ? (
          <div className="grid grid-cols-1 gap-6"><UpdateLog /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className={`lg:col-span-3 ${activeTab === "ai" ? "hidden lg:block" : ""}`}>
              {activeTab === "forum" && <Forum />}
              {activeTab === "ranks" && <div className="lg:hidden"><Leaderboard /></div>}
              <div className={activeTab === "ranks" || activeTab === "forum" ? "hidden lg:block" : ""}>
                {selectedSnippet ? (
                  <SnippetView snippet={selectedSnippet} onBack={() => setSelectedSnippet(null)} />
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Shared Snippets</h2>
                      <span className="text-xs text-muted-foreground">{snippets.length} snippets</span>
                    </div>
                    {snippets.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Code2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p className="text-sm">No snippets shared yet</p>
                        <p className="text-xs mt-1">Be the first to share your Bloxd code!</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {snippets.map((snippet) => (
                          <SnippetCard
                            key={snippet.id}
                            snippet={snippet}
                            onClick={() => setSelectedSnippet(snippet)}
                            onDelete={handleDelete}
                            onLikeChange={handleLikeChange}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className={`lg:col-span-2 space-y-4 ${activeTab === "ai" ? "" : "hidden lg:block"}`}>
              {user ? <AiChat /> : (
                <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">Sign in to use the AI assistant.</div>
              )}
              <div className="hidden lg:block"><Leaderboard /></div>
            </div>
          </div>
        )}
      </main>

      <NewSnippetDialog
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        onSubmit={handleNewSnippet}
      />
    </div>
  );
};

export default Index;
