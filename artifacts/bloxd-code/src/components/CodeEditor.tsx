import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  readOnly?: boolean;
}

const CodeEditor = ({ code, onChange, readOnly = false }: CodeEditorProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast({ title: "Copied!", description: "Code copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split("\n");

  return (
    <div className="relative rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive/60" />
          <div className="w-3 h-3 rounded-full bg-neon-orange/60" />
          <div className="w-3 h-3 rounded-full bg-neon-green/60" />
          <span className="ml-3 text-xs text-muted-foreground font-mono">bloxd-script.js</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="text-muted-foreground hover:text-primary">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <div className="flex overflow-auto max-h-[400px]">
        <div className="select-none py-4 px-3 text-right text-muted-foreground/40 font-mono text-xs leading-relaxed border-r border-border/50">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        {readOnly ? (
          <pre className="flex-1 p-4 code-editor text-foreground overflow-x-auto whitespace-pre">
            {code}
          </pre>
        ) : (
          <textarea
            value={code}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 p-4 code-editor bg-transparent text-foreground resize-none outline-none min-h-[200px]"
            spellCheck={false}
            placeholder="// Write your Bloxd code here..."
          />
        )}
      </div>
    </div>
  );
};

export default CodeEditor;
