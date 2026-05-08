import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Heart, Eye, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { snippetsApi, notifyChange } from "@/lib/demo-data";
import { useAuth } from "@/contexts/AuthContext";

interface Snippet {
  id: string;
  title: string;
  code: string;
  author: string;
  likes: number;
  views: number;
  createdAt: string;
  userId?: string;
}

interface SnippetCardProps {
  snippet: Snippet;
  onClick: () => void;
}

// Store likes in localStorage
const LIKES_KEY = 'bloxd_demo_snippet_likes';

const getLikedSnippets = (userId: string): Set<string> => {
  try {
    const stored = localStorage.getItem(`${LIKES_KEY}_${userId}`);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

const saveLikedSnippets = (userId: string, likes: Set<string>) => {
  localStorage.setItem(`${LIKES_KEY}_${userId}`, JSON.stringify([...likes]));
};

const SnippetCard = ({ snippet, onClick }: SnippetCardProps) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(snippet.likes);
  const [loading, setLoading] = useState(false);

  const isOwner = user && snippet.userId === user.id;

  useEffect(() => {
    if (!user) return;
    const likedSnippets = getLikedSnippets(user.id);
    setLiked(likedSnippets.has(snippet.id));
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

    const likedSnippets = getLikedSnippets(user.id);
    
    if (liked) {
      setLiked(false);
      setLikeCount((c) => c - 1);
      likedSnippets.delete(snippet.id);
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      likedSnippets.add(snippet.id);
      snippetsApi.like(snippet.id);
    }
    
    saveLikedSnippets(user.id, likedSnippets);
    setLoading(false);
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(snippet.code);
    toast({ title: "Copied!", description: "Code copied to clipboard" });
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner) return;
    const confirmed = window.confirm("Delete this snippet?");
    if (!confirmed) return;
    
    snippetsApi.delete(snippet.id);
    notifyChange();
    toast({ title: "Deleted", description: "Snippet removed" });
  };

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-lg border border-border bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:glow-cyan"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate pr-2">
          {snippet.title}
        </h3>
        <div className="flex items-center gap-1 shrink-0">
          {isOwner && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-primary"
            onClick={handleCopy}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
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
