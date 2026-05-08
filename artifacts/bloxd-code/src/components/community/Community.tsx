import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useApi, apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Users, Hash, Send, Plus, LogIn, LogOut, Volume2 } from "lucide-react";
import ChatRoom from "./ChatRoom";
import VoiceRoom from "./VoiceRoom";

type Channel = { id: string; serverId: string; name: string; type: string; position: number };
type Server = { id: string; name: string; iconUrl: string | null; ownerId: string; inviteCode: string };

const Community = () => {
  const { user } = useAuth();
  const api = useApi();
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [inviteInput, setInviteInput] = useState("");
  const [serverNameInput, setServerNameInput] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchServers = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api(`/community/servers/user/${user.id}`) as Server[];
      setServers(data);
      if (data.length > 0 && !selectedServer) setSelectedServer(data[0]);
    } catch {}
    setLoading(false);
  }, [user]);

  const fetchChannels = useCallback(async (serverId: string) => {
    try {
      const data = await apiFetch(`/community/servers/${serverId}/channels`) as Channel[];
      const sorted = data.sort((a, b) => a.position - b.position);
      setChannels(sorted);
      const firstText = sorted.find((c) => c.type === "text");
      if (firstText && !selectedChannel) setSelectedChannel(firstText);
    } catch {}
  }, []);

  useEffect(() => { fetchServers(); }, [fetchServers]);
  useEffect(() => { if (selectedServer) fetchChannels(selectedServer.id); }, [selectedServer, fetchChannels]);

  const handleJoinServer = async () => {
    if (!inviteInput.trim()) return;
    try {
      const server = await api("/community/servers/join", { method: "POST", body: JSON.stringify({ invite_code: inviteInput.trim() }) }) as Server;
      setServers((prev) => prev.find((s) => s.id === server.id) ? prev : [...prev, server]);
      setSelectedServer(server);
      setInviteInput("");
      toast({ title: `Joined ${server.name}!` });
    } catch (e: unknown) {
      toast({ title: "Failed to join", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleCreateServer = async () => {
    if (!serverNameInput.trim()) return;
    try {
      const server = await api("/community/servers", { method: "POST", body: JSON.stringify({ name: serverNameInput.trim() }) }) as Server;
      setServers((prev) => [...prev, server]);
      setSelectedServer(server);
      setServerNameInput("");
      setShowCreate(false);
      toast({ title: `Created ${server.name}!` });
    } catch (e: unknown) {
      toast({ title: "Failed to create", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleLeaveServer = async () => {
    if (!selectedServer) return;
    if (!window.confirm(`Leave ${selectedServer.name}?`)) return;
    try {
      await api(`/community/servers/${selectedServer.id}/leave`, { method: "POST" });
      setServers((prev) => prev.filter((s) => s.id !== selectedServer.id));
      setSelectedServer(null);
      setChannels([]);
      setSelectedChannel(null);
      toast({ title: "Left server" });
    } catch {}
  };

  if (!user) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">Sign in to join the community</p>
        <p className="text-xs mt-1">Connect with other Bloxd players and share your creations</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] border border-border rounded-lg overflow-hidden bg-card/20">
      {/* Server list */}
      <div className="w-16 border-r border-border bg-card/50 flex flex-col items-center py-3 gap-2 overflow-y-auto">
        {servers.map((s) => (
          <button
            key={s.id}
            onClick={() => { setSelectedServer(s); setSelectedChannel(null); }}
            title={s.name}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${selectedServer?.id === s.id ? "bg-primary text-primary-foreground ring-2 ring-primary/50" : "bg-secondary hover:bg-primary/20 text-foreground"}`}
          >
            {s.iconUrl ? <img src={s.iconUrl} alt={s.name} className="w-full h-full rounded-full object-cover" /> : s.name.slice(0, 2).toUpperCase()}
          </button>
        ))}
        <button
          onClick={() => setShowCreate(!showCreate)}
          title="Create server"
          className="w-10 h-10 rounded-full bg-secondary hover:bg-primary/20 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Channels sidebar */}
      <div className="w-52 border-r border-border bg-card/30 flex flex-col">
        {showCreate ? (
          <div className="p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Create Server</p>
            <Input value={serverNameInput} onChange={(e) => setServerNameInput(e.target.value)} placeholder="Server name" className="h-8 text-sm" onKeyDown={(e) => e.key === "Enter" && handleCreateServer()} />
            <Button size="sm" variant="neon" className="w-full h-7 text-xs" onClick={handleCreateServer}>Create</Button>
            <div className="pt-1 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Join by Invite</p>
              <Input value={inviteInput} onChange={(e) => setInviteInput(e.target.value)} placeholder="Invite code" className="h-8 text-sm" onKeyDown={(e) => e.key === "Enter" && handleJoinServer()} />
              <Button size="sm" variant="secondary" className="w-full h-7 text-xs mt-1" onClick={handleJoinServer}><LogIn className="h-3 w-3 mr-1" />Join</Button>
            </div>
          </div>
        ) : selectedServer ? (
          <>
            <div className="p-3 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground text-sm truncate">{selectedServer.name}</h2>
              <div className="flex items-center gap-1">
                <button title="Invite code" onClick={() => { navigator.clipboard.writeText(selectedServer.inviteCode); toast({ title: "Invite code copied!", description: selectedServer.inviteCode }); }} className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors text-xs">🔗</button>
                <button title="Leave server" onClick={handleLeaveServer} className="p-1 hover:bg-destructive/20 rounded text-muted-foreground hover:text-destructive transition-colors">
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {channels.filter((c) => c.type === "text").length > 0 && (
                <p className="text-xs text-muted-foreground uppercase tracking-wider px-2 py-1 flex items-center gap-1"><Hash className="h-3 w-3" />Text Channels</p>
              )}
              {channels.filter((c) => c.type === "text").map((ch) => (
                <button key={ch.id} onClick={() => setSelectedChannel(ch)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${selectedChannel?.id === ch.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}>
                  <Hash className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{ch.name}</span>
                </button>
              ))}
              {channels.filter((c) => c.type === "voice").length > 0 && (
                <p className="text-xs text-muted-foreground uppercase tracking-wider px-2 py-1 mt-2 flex items-center gap-1"><Volume2 className="h-3 w-3" />Voice Channels</p>
              )}
              {channels.filter((c) => c.type === "voice").map((ch) => (
                <button key={ch.id} onClick={() => setSelectedChannel(ch)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${selectedChannel?.id === ch.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}>
                  <Volume2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{ch.name}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-muted-foreground gap-3">
            <Users className="h-8 w-8 opacity-30" />
            <p className="text-xs">No servers yet</p>
            <Button size="sm" variant="neon" className="text-xs" onClick={() => setShowCreate(true)}>Create or Join</Button>
          </div>
        )}

        <div className="p-2 border-t border-border">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-secondary/30">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
              {(user.username || "A").slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{user.username}</p>
              <div className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded-full" /><p className="text-[10px] text-muted-foreground">Online</p></div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat / Voice area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedChannel ? (
          selectedChannel.type === "voice" ? (
            <VoiceRoom channelId={selectedChannel.id} channelName={selectedChannel.name} userId={user.id} username={user.username} />
          ) : (
            <ChatRoom channelId={selectedChannel.id} channelName={selectedChannel.name} userId={user.id} username={user.username} isAdmin={selectedServer?.ownerId === user.id} />
          )
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            {selectedServer ? "Select a channel to start chatting" : "Create or join a server to get started"}
          </div>
        )}
      </div>
    </div>
  );
};

export default Community;
