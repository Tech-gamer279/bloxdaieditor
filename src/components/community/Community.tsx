import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import ServerList from "./ServerList";
import ChannelList from "./ChannelList";
import MemberList from "./MemberList";
import ChatRoom from "./ChatRoom";
import VoiceRoom from "./VoiceRoom";
import DMPanel from "./DMPanel";
import type { Server, Channel, Member, PublicServer } from "./types";
import { Users, Globe, Hash } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const Community = () => {
  const { user } = useAuth();
  const [servers, setServers] = useState<Server[]>([]);
  const [activeServer, setActiveServer] = useState<Server | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [username, setUsername] = useState("anonymous");

  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [chanOpen, setChanOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPublic, setNewPublic] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [chanName, setChanName] = useState("");
  const [chanType, setChanType] = useState<"text" | "voice">("text");
  const [banTarget, setBanTarget] = useState<Member | null>(null);
  const [banDuration, setBanDuration] = useState<number>(0);
  const [banReason, setBanReason] = useState("");
  const [publicServers, setPublicServers] = useState<PublicServer[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);

  const [dm, setDm] = useState<{ id: string; otherId: string; otherName: string } | null>(null);

  const myMembership = members.find((m) => m.user_id === user?.id);
  const isAdmin = myMembership?.role === "owner" || myMembership?.role === "admin";

  // Load profile username
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("username").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data?.username) setUsername(data.username);
    });
  }, [user]);

  // Load servers
  const loadServers = async () => {
    const { data } = await supabase.from("servers").select("*").order("created_at");
    setServers((data || []) as Server[]);
    if (data && data.length && !activeServer) setActiveServer(data[0] as Server);
  };
  useEffect(() => { if (user) loadServers(); }, [user]);

  const loadServerData = async (server: Server) => {
    const [chRes, memRes] = await Promise.all([
      supabase.from("channels").select("*").eq("server_id", server.id).order("position"),
      supabase.from("server_members").select("*").eq("server_id", server.id),
    ]);
    const ch = (chRes.data || []) as Channel[];
    setChannels(ch);
    const mems = (memRes.data || []) as Member[];
    if (mems.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id,username,avatar_url").in("user_id", mems.map((m) => m.user_id));
      const pm = new Map((profs || []).map((p) => [p.user_id, p]));
      setMembers(mems.map((m) => ({ ...m, username: pm.get(m.user_id)?.username, avatar_url: pm.get(m.user_id)?.avatar_url })));
    } else setMembers([]);
    if (!activeChannel || activeChannel.server_id !== server.id) {
      setActiveChannel(ch.find((c) => c.type === "text") || ch[0] || null);
    }
  };

  // Load channels & members for active server
  useEffect(() => {
    if (!activeServer) { setChannels([]); setMembers([]); setActiveChannel(null); return; }
    loadServerData(activeServer);
    const sub = supabase
      .channel(`server-${activeServer.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "channels", filter: `server_id=eq.${activeServer.id}` }, () => loadServerData(activeServer))
      .on("postgres_changes", { event: "*", schema: "public", table: "server_members", filter: `server_id=eq.${activeServer.id}` }, () => loadServerData(activeServer))
      .subscribe();
    return () => { supabase.removeChannel(sub); };
    // eslint-disable-next-line
  }, [activeServer]);

  // Presence per server
  useEffect(() => {
    if (!activeServer || !user) return;
    const ch = supabase.channel(`presence-${activeServer.id}`, { config: { presence: { key: user.id } } });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      setOnlineIds(new Set(Object.keys(state)));
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ at: Date.now() });
    });
    return () => { supabase.removeChannel(ch); };
  }, [activeServer, user]);

  const createServer = async () => {
    if (!newName.trim()) return;
    const { data, error } = await supabase.rpc("create_server", { _name: newName.trim() });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    const newId = data as string;
    if (newPublic) {
      await supabase.from("servers").update({ is_public: true }).eq("id", newId);
    }
    setNewName(""); setNewPublic(false); setCreateOpen(false);
    await loadServers();
    const { data: s } = await supabase.from("servers").select("*").eq("id", newId).single();
    if (s) setActiveServer(s as Server);
  };

  const togglePublic = async () => {
    if (!activeServer || activeServer.owner_id !== user?.id) return;
    const next = !activeServer.is_public;
    const { error } = await supabase.from("servers").update({ is_public: next }).eq("id", activeServer.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: next ? "Server is now public" : "Server set to private" });
    setActiveServer({ ...activeServer, is_public: next });
    await loadServers();
  };

  const openBrowse = async () => {
    setBrowseOpen(true);
    setBrowseLoading(true);
    const { data, error } = await supabase.rpc("list_public_servers");
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    setPublicServers((data || []) as PublicServer[]);
    setBrowseLoading(false);
  };

  const joinPublic = async (id: string) => {
    const { error } = await supabase.rpc("join_public_server", { _server: id });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Joined!" });
    setBrowseOpen(false);
    await loadServers();
    const { data: s } = await supabase.from("servers").select("*").eq("id", id).single();
    if (s) setActiveServer(s as Server);
  };

  const joinServer = async () => {
    if (!inviteCode.trim()) return;
    const { data, error } = await supabase.rpc("join_server_by_invite", { _code: inviteCode.trim() });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setInviteCode(""); setJoinOpen(false);
    await loadServers();
    const { data: s } = await supabase.from("servers").select("*").eq("id", data as string).single();
    if (s) setActiveServer(s as Server);
  };

  const createChannel = async () => {
    if (!chanName.trim() || !activeServer) return;
    const { error } = await supabase.from("channels").insert({
      server_id: activeServer.id, name: chanName.trim(), type: chanType, position: channels.length,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    setChanName(""); setChanOpen(false);
  };

  const leaveServer = async () => {
    if (!activeServer || !user) return;
    if (!confirm(`Leave ${activeServer.name}?`)) return;
    await supabase.from("server_members").delete().eq("server_id", activeServer.id).eq("user_id", user.id);
    setActiveServer(null);
    await loadServers();
  };

  const handleBan = async () => {
    if (!activeServer || !banTarget || !user) return;
    const durationDays = banDuration;
    const { error } = await supabase.rpc("ban_member", {
      _server: activeServer.id,
      _user: banTarget.user_id,
      _reason: banReason.trim() || null,
      _days: durationDays,
    });

    if (error) {
      toast({ title: "Ban failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "User banned", description: `${banTarget.username || "Member"} has been banned.` });
    setBanTarget(null);
    setBanDuration(0);
    setBanReason("");
    await loadServers();
    if (activeServer) await loadServerData(activeServer);
  };

  const openDM = async (otherId: string) => {
    if (!user || otherId === user.id) return;
    const { data, error } = await supabase.rpc("get_or_create_dm", { _other: otherId });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    const other = members.find((m) => m.user_id === otherId);
    setDm({ id: data as string, otherId, otherName: other?.username || "user" });
  };

  if (!user) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">Sign in to join the community</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] border border-border rounded-lg overflow-hidden bg-card/20">
      <ServerList
        servers={servers}
        activeId={activeServer?.id || null}
        onSelect={(id) => setActiveServer(servers.find((s) => s.id === id) || null)}
        onCreate={() => setCreateOpen(true)}
        onJoin={() => setJoinOpen(true)}
      />
      <ChannelList
        server={activeServer}
        channels={channels}
        activeChannelId={activeChannel?.id || null}
        isAdmin={isAdmin}
        onSelect={setActiveChannel}
        onCreateChannel={() => setChanOpen(true)}
        onLeave={leaveServer}
        onInvite={() => setInviteOpen(true)}
      />
      {activeServer && activeChannel ? (
        activeChannel.type === "text" ? (
          <ChatRoom channelId={activeChannel.id} channelName={activeChannel.name} userId={user.id} username={username} isAdmin={isAdmin} />
        ) : (
          <VoiceRoom channelId={activeChannel.id} channelName={activeChannel.name} userId={user.id} username={username} />
        )
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          {activeServer ? "Pick a channel" : "Welcome to the community"}
        </div>
      )}
      {activeServer && <MemberList members={members} onlineIds={onlineIds} onDM={openDM} onBan={(member) => setBanTarget(member)} currentUserId={user.id} isAdmin={isAdmin} />}

      {dm && (
        <DMPanel conversationId={dm.id} otherUserId={dm.otherId} otherName={dm.otherName} userId={user.id} onClose={() => setDm(null)} />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create a server</DialogTitle></DialogHeader>
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="My awesome server" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="neon" onClick={createServer}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Join with invite code</DialogTitle></DialogHeader>
          <Input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="abc12345" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setJoinOpen(false)}>Cancel</Button>
            <Button variant="neon" onClick={joinServer}>Join</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Server invite</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Share this invite code with friends to let them join your server.</p>
            <div className="rounded-lg border border-border bg-background p-3 text-sm font-semibold">{activeServer?.invite_code || "-"}</div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>Close</Button>
            <Button variant="neon" onClick={() => { navigator.clipboard.writeText(activeServer?.invite_code || ""); toast({ title: "Invite copied", description: activeServer?.invite_code }); }}>
              Copy code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!banTarget} onOpenChange={(open) => { if (!open) setBanTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select how long this member should be banned from the server.</p>
            <div className="grid grid-cols-3 gap-2">
              {[{ label: "Permanent", value: 0 }, { label: "1 day", value: 1 }, { label: "7 days", value: 7 }, { label: "30 days", value: 30 }].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setBanDuration(option.value)}
                  className={`rounded-lg border px-3 py-2 text-sm ${banDuration === option.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <Input value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Reason (optional)" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setBanTarget(null); setBanDuration(0); setBanReason(""); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBan}>
              Ban member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={chanOpen} onOpenChange={setChanOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New channel</DialogTitle></DialogHeader>
          <Input value={chanName} onChange={(e) => setChanName(e.target.value)} placeholder="channel-name" />
          <div className="flex gap-2">
            <Button variant={chanType === "text" ? "neon" : "ghost"} size="sm" onClick={() => setChanType("text")}>Text</Button>
            <Button variant={chanType === "voice" ? "neon" : "ghost"} size="sm" onClick={() => setChanType("voice")}>Voice</Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setChanOpen(false)}>Cancel</Button>
            <Button variant="neon" onClick={createChannel}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Community;
