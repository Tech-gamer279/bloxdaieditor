import { Plus, Hash, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Server } from "./types";
import { cn } from "@/lib/utils";

interface Props {
  servers: Server[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onJoin: () => void;
}

const ServerList = ({ servers, activeId, onSelect, onCreate, onJoin }: Props) => {
  return (
    <div className="flex flex-col items-center gap-2 py-3 px-2 bg-background/60 border-r border-border w-[64px] shrink-0">
      {servers.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          title={s.name}
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm transition-all overflow-hidden",
            activeId === s.id
              ? "bg-primary text-primary-foreground rounded-xl"
              : "bg-card text-foreground hover:bg-primary/20 hover:rounded-xl"
          )}
        >
          {s.icon_url ? (
            <img src={s.icon_url} alt={s.name} className="w-full h-full object-cover" />
          ) : (
            s.name.slice(0, 2).toUpperCase()
          )}
        </button>
      ))}
      <div className="w-8 h-px bg-border my-1" />
      <Button
        size="icon"
        variant="ghost"
        onClick={onCreate}
        title="Create server"
        className="w-12 h-12 rounded-2xl hover:rounded-xl hover:bg-primary/20 text-primary"
      >
        <Plus className="h-5 w-5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={onJoin}
        title="Join server"
        className="w-12 h-12 rounded-2xl hover:rounded-xl hover:bg-accent/20 text-accent"
      >
        <Compass className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default ServerList;
