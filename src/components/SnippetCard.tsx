import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Heart, Eye, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Snippet {
  id: string;
  title: string;
  code: string;
  author: string;
  likes: number;
  views: number;
  createdAt: string;
}

interface SnippetCardProps {
  snippet: Snippet;
  onClick: () => void;
  onDelete?: () => void;
}

const SnippetCard = ({ snippet, onClick, onDelete }: SnippetCardProps) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(snippet.likes);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("snippet_likes")
      .select("id")
      .eq("snippet_id", snippet.id)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setLiked(!!data));
  }, [user, snippet.id]);

  useEffect(() => {
    setLikeCount(snippet.likes);
  }, [snippet.likes]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({ title: "Sign in required", description: "You need to sign in to like snippets", variant: "destructive" });
      return;
    }
    if (loading) return;
    setLoading(true);

    if (liked) {
      setLiked(false);
      setLikeCount((c) => c - 1);
      await supabase.from("snippet_likes").delete().eq("snippet_id", snippet.id).eq("user_id", user.id);
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      await supabase.from("snippet_likes").insert({ snippet_id: snippet.id, user_id: user.id });
    }
    setLoading(false);
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(snippet.code);
    toast({ title: "Copied!", description: "Code copied to clipboard" });
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const confirmed = window.confirm("Delete this snippet?");
    if (!confirmed) return;
    const { error } = await supabase.from("snippets").delete().eq("id", snippet.id).eq("user_id", user.id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete snippet", variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Snippet removed" });
      onDelete?.();
    }
  };

  const isOwner = user?.id === snippet.id ? false : !!user; // we need user_id on snippet

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-lg border border-border bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:glow-cyan"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate pr-2">
          {snippet.title}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary"
          onClick={handleCopy}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>

      <pre className="code-editor text-muted-foreground bg-secondary/30 rounded p-3 mb-3 overflow-hidden max-h-[80px] text-xs">
        {snippet.code.slice(0, 150)}...
      </pre>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="text-primary/70">@{snippet.author}</span>
        <div className="flex items-center gap-3">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 transition-colors ${
              liked ? "text-red-500" : "hover:text-red-400"
            }`}
          >
            <Heart className={`h-3 w-3 ${liked ? "fill-current" : ""}`} /> {likeCount}
          </button>
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" /> {snippet.views}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SnippetCard;
export type { Snippet };
