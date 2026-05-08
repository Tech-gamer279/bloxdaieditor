import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Upload } from "lucide-react";
import CodeEditor from "./CodeEditor";
import { toast } from "@/hooks/use-toast";
import type { Snippet } from "./SnippetCard";

interface NewSnippetDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (snippet: Snippet) => void;
}

const NewSnippetDialog = ({ open, onClose, onSubmit }: NewSnippetDialogProps) => {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [code, setCode] = useState("");

  if (!open) return null;

  const handleSubmit = () => {
    if (!title.trim() || !code.trim()) {
      toast({ title: "Missing fields", description: "Title and code are required", variant: "destructive" });
      return;
    }
    onSubmit({
      id: crypto.randomUUID(),
      title: title.trim(),
      code: code.trim(),
      author: author.trim() || "anonymous",
      likes: 0,
      views: 0,
      createdAt: new Date().toISOString(),
    });
    setTitle("");
    setAuthor("");
    setCode("");
    onClose();
    toast({ title: "Shared!", description: "Your code snippet has been shared" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">Share Your <span className="text-primary">Bloxd Code</span></h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Auto-builder script"
              className="w-full bg-secondary/50 rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary/40 transition-colors"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Author</label>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Your username (optional)"
              className="w-full bg-secondary/50 rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary/40 transition-colors"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Code</label>
            <CodeEditor code={code} onChange={setCode} />
          </div>
          <Button variant="neon" className="w-full" onClick={handleSubmit}>
            <Upload className="h-4 w-4" />
            Share Snippet
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NewSnippetDialog;
