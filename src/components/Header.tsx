import { Button } from "@/components/ui/button";
import { Code2, Plus } from "lucide-react";

interface HeaderProps {
  onNewSnippet: () => void;
}

const Header = ({ onNewSnippet }: HeaderProps) => {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center glow-cyan">
            <Code2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              Bloxd<span className="text-primary">.code</span>
            </h1>
          </div>
        </div>

        <Button variant="neon" size="sm" onClick={onNewSnippet}>
          <Plus className="h-4 w-4" />
          Share Code
        </Button>
      </div>
    </header>
  );
};

export default Header;
