import { useState, useEffect } from "react";
import Header from "@/components/Header";
import SnippetCard from "@/components/SnippetCard";
import type { Snippet } from "@/components/SnippetCard";
import SnippetView from "@/components/SnippetView";
import NewSnippetDialog from "@/components/NewSnippetDialog";
import AiChat from "@/components/AiChat";
import Leaderboard from "@/components/Leaderboard";
import Forum from "@/components/Forum";
import { Code2, Sparkles, Trophy, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const { user } = useAuth();
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"snippets" | "ai" | "ranks" | "forum">("snippets");

  const fetchSnippets = async () => {
    const { data } = await supabase
      .from("snippets")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      setSnippets(
        data.map((s) => ({
          id: s.id,
          title: s.title,
          code: s.code,
          author: s.author_name,
          likes: s.likes,
          views: s.views,
          createdAt: s.created_at,
          userId: s.user_id,
        }))
      );
    }
  };

  useEffect(() => {
    fetchSnippets();

    const channel = supabase
      .channel("snippets-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "snippets" }, () => {
        fetchSnippets();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleNewSnippet = async (snippet: Snippet) => {
    if (!user) {
      toast({ title: "Sign in required", description: "You need to sign in to share snippets", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("snippets").insert({
      title: snippet.title,
      code: snippet.code,
      author_name: snippet.author || "anonymous",
      user_id: user.id,
    });
    if (error) {
      toast({ title: "Error", description: "Failed to share snippet", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onNewSnippet={() => setShowNewDialog(true)} />

      <main className="container px-4 py-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("snippets")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "snippets"
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Code2 className="h-4 w-4" />
            Code Snippets
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "ai"
                ? "bg-accent/15 text-accent border border-accent/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            AI Coder
          </button>
          <button
            onClick={() => setActiveTab("forum")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "forum"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Forum
          </button>
          <button
            onClick={() => setActiveTab("ranks")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "ranks"
                ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Trophy className="h-4 w-4" />
            Ranks
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Snippets / Ranks panel */}
          <div className={`lg:col-span-3 ${activeTab === "ai" ? "hidden lg:block" : ""}`}>
            {activeTab === "forum" && (
              <Forum />
            )}
            {activeTab === "ranks" && (
              <div className="lg:hidden">
                <Leaderboard />
              </div>
            )}
            <div className={activeTab === "ranks" || activeTab === "forum" ? "hidden lg:block" : ""}>
              {selectedSnippet ? (
                <SnippetView snippet={selectedSnippet} onBack={() => setSelectedSnippet(null)} />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Shared Snippets
                    </h2>
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
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* AI Chat + Leaderboard panel */}
          <div className={`lg:col-span-2 space-y-4 ${activeTab === "ai" ? "" : "hidden lg:block"}`}>
            <AiChat />
            <div className="hidden lg:block">
              <Leaderboard />
            </div>
          </div>
        </div>
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
