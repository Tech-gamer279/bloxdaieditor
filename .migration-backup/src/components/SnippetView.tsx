import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import CodeEditor from "./CodeEditor";
import type { Snippet } from "./SnippetCard";

interface SnippetViewProps {
  snippet: Snippet;
  onBack: () => void;
}

const SnippetView = ({ snippet, onBack }: SnippetViewProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-bold text-foreground">{snippet.title}</h2>
          <p className="text-xs text-muted-foreground">by <span className="text-primary/70">@{snippet.author}</span></p>
        </div>
      </div>
      <CodeEditor code={snippet.code} onChange={() => {}} readOnly />
    </div>
  );
};

export default SnippetView;
