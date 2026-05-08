import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Heart, Eye, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  useToggleSnippetLike,
  useDeleteSnippet,
  getListSnippetsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface Snippet {
  id: string;
  title: string;
  code: string;
  author: string;
  likes: number;
  views: number;
  createdAt: string;
  userId?: string;
  liked?: boolean;
}

interface SnippetCardProps {
  snippet: Snippet;
  onClick: () => void;
  onDelete?: (id: string) => void;
  onLikeChange?: (id: string, liked: boolean, newCount: number) => void;
}

const SnippetCard = ({ snippet, onClick, onDelete, onLikeChange }: SnippetCardProps) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [liked, setLiked] = useState(snippet.liked ?? false);
  const [likeCount, setLikeCount] = useState(snippet.likes);

  const isOwner = user && snippet.userId === user.id;

  const toggleLikeMutation = useToggleSnippetLike({
    mutation: {
      onSuccess: (result) => {
        const newLiked = result.liked;
        const newCount = newLiked ? likeCount + 1 : likeCount - 1;
        setLiked(newLiked);
        setLikeCount(newCount);
        onLikeChange?.(snippet.id, newLiked, newCount);
      },
      onError: () => {
        toast({ title: "Failed to like", variant: "destructive" });
      },
    },
  });

  const deleteSnippetMutation = useDeleteSnippet({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListSnippetsQueryKey() });
        onDelete?.(snippet.id);
        toast({ title: "Deleted" });
      },
      onError: () => {
        toast({ title: "Failed to delete", variant: "destructive" });
      },
    },
  });

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({ title: "Sign in required", description: "You need to sign in to like snippets", variant: "destructive" });
      return;
    }
    toggleLikeMutation.mutate({ id: snippet.id });
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(snippet.code);
    toast({ title: "Copied!", description: "Code copied to clipboard" });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner) return;
    if (!window.confirm("Delete this snippet?")) return;
    deleteSnippetMutation.mutate({ id: snippet.id });
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
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={handleCopy}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <pre className="code-editor text-muted-foreground bg-secondary/30 rounded p-3 mb-3 overflow-hidden max-h-[80px] text-xs">
        {snippet.code.slice(0, 150)}{snippet.code.length > 150 ? "..." : ""}
      </pre>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="text-primary/70">@{snippet.author}</span>
        <div className="flex items-center gap-3">
          <button
            onClick={handleLike}
            disabled={toggleLikeMutation.isPending}
            className={`flex items-center gap-1 transition-colors ${liked ? "text-red-500" : "hover:text-red-400"}`}
          >
            <Heart className={`h-3 w-3 ${liked ? "fill-current" : ""}`} /> {likeCount}
          </button>
          <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {snippet.views}</span>
        </div>
      </div>
    </div>
  );
};

export default SnippetCard;
export type { Snippet };
