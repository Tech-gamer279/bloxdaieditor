import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Code2, Plus, LogIn, LogOut, User, Settings, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import SettingsDialog from "@/components/SettingsDialog";

interface HeaderProps {
  onNewSnippet: () => void;
}

const Header = ({ onNewSnippet }: HeaderProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);

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

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {user.email}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
                <User className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
                <ShieldCheck className="h-4 w-4" />
              </Button>
              <Button variant="neon" size="sm" onClick={onNewSnippet}>
                <Plus className="h-4 w-4" />
                Share Code
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button variant="neon" size="sm" onClick={() => navigate("/auth")}>
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
          )}
        </div>
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </div>
    </header>
  );
};

export default Header;
