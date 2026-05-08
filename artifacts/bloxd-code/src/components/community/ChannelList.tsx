import { Hash, Volume2, Plus, Settings, Copy, LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Channel, Server } from "./types";
import { toast } from "@/hooks/use-toast";

interface Props {
  server: Server | null;
  channels: Channel[];
  activeChannelId: string | null;
  isAdmin: boolean;
  onSelect: (c: Channel) => void;
  onCreateChannel: () => void;
  onLeave: () => void;
  onInvite: () => void;
}

const ChannelList = ({ server, channels, activeChannelId, isAdmin, onSelect, onCreateChannel, onLeave, onInvite }: Props) => {
  if (!server) {
    return (
      <div className="w-56 shrink-0 bg-card/40 border-r border-border flex items-center justify-center text-xs text-muted-foreground p-4 text-center">
        Select or create a server to start chatting
      </div>
    );
  }
  const text = channels.filter((c) => c.type === "text");
  const voice = channels.filter((c) => c.type === "voice");

  const copyInvite = () => {
    navigator.clipboard.writeText(server.invite_code);
    toast({ title: "Invite copied", description: server.invite_code });
  };

  return (
    <div className="w-56 shrink-0 bg-card/40 border-r border-border flex flex-col">
      <div className="px-3 py-3 border-b border-border flex items-center justify-between">
        <div className="font-semibold text-sm truncate">{server.name}</div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onInvite} title="Invite">
            <Users className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={copyInvite} title="Copy invite">
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
        <div>
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Text</span>
            {isAdmin && (
              <button onClick={onCreateChannel} className="text-muted-foreground hover:text-foreground">
                <Plus className="h-3 w-3" />
              </button>
            )}
          </div>
          {text.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors",
                activeChannelId === c.id
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              <Hash className="h-4 w-4 shrink-0" />
              <span className="truncate">{c.name}</span>
            </button>
          ))}
        </div>
        <div>
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Voice</span>
          </div>
          {voice.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors",
                activeChannelId === c.id
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              <Volume2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{c.name}</span>
            </button>
          ))}
        </div>
        <div className="border-t border-border px-2 py-2 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Bots</span>
          </div>
          <div className="space-y-2">
            {[
              { name: "Level App", description: "Track XP, levels, and server rankings." },
              { name: "Bloxmod", description: "Moderation help for warnings, bans, and reports." },
            ].map((bot) => (
              <div key={bot.name} className="rounded-lg border border-border bg-background p-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{bot.name}</div>
                    <div className="text-xs text-muted-foreground">{bot.description}</div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => {
                      navigator.clipboard.writeText(`/invite ${bot.name.toLowerCase().replace(/\s+/g, "-")}`);
                      toast({ title: `${bot.name} command copied`, description: "Paste it into chat to invite this bot." });
                    }}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-border p-2">
        <Button size="sm" variant="ghost" className="w-full justify-start text-xs text-muted-foreground" onClick={onLeave}>
          <LogOut className="h-3.5 w-3.5" /> Leave server
        </Button>
      </div>
    </div>
  );
};

export default ChannelList;
