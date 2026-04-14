import { Button } from "@/components/ui/button";
import { Copy, Heart, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
}

const SnippetCard = ({ snippet, onClick }: SnippetCardProps) => {
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(snippet.code);
    toast({ title: "Copied!", description: "Code copied to clipboard" });
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
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" /> {snippet.likes}
          </span>
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
