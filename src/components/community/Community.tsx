import { useEffect, useMemo, useState } from "react";
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
import PostsPanel from "./PostsPanel";
import ServerSettings from "./ServerSettings";
import type { Server, Channel, Member } from "./types";
import { Users, Megaphone, Hash as HashIcon, Settings as SettingsIcon } from "lucide-react";

type View = "channel" | "posts";

const Community = () => {
  const { user } = useAuth();
  const [servers, setServers] = useState<Server[]>([]);
  const [activeServer, setActiveServer] = useState<Server | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [username, setUsername] = useState("anonymous");
  const [view, setView] = useState<View>("channel");
  const [memberColors, setMemberColors] = useState<Map<string, string>>(new Map());
  const [customEmojis, setCustomEmojis] = useState<{ id: string; name: string; image_url: string }[]>([]);
  const [bloxmodEnabled, setBloxmodEnabled] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [chanOpen, setChanOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [chanName, setChanName] = useState("");
  const [chanType, setChanType] = useState<"text" | "voice">("text");

  const [dm, setDm] = useState<{ id: string; otherId: string; otherName: string } | null>(null);

  const myMembership = members.find((m) => m.user_id === user?.id);
  const isAdmin = myMembership?.role === "owner" || myMembership?.role === "admin";
  const isOwner = myMembership?.role === "owner";

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("username").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data?.username) setUsername(data.username);
    });
  }, [user]);

  const loadServers = async () => {
    const { data } = await supabase.from("servers").select("*").order("created_at");
    setServers((data || []) as Server[]);
    if (data && data.length && !activeServer) setActiveServer(data[0] as Server);
  };
  useEffect(() => { if (user) loadServers(); }, [user]);

  useEffect(() => {
    if (!activeServer) {
      setChannels([]); setMembers([]); setActiveChannel(null);
      setMemberColors(new Map()); setCustomEmojis([]); setBloxmodEnabled(false);
      return;
    }
    const load = async () => {
      const [chRes, memRes, rolesRes, mrRes, emojiRes, botsRes] = await Promise.all([
        supabase.from("channels").select("*").eq("server_id", activeServer.id).order("position"),
        supabase.from("server_members").select("*").eq("server_id", activeServer.id),
        supabase.from("server_roles").select("id,color,position").eq("server_id", activeServer.id).order("position", { ascending: false }),
        supabase.from("server_member_roles").select("user_id,role_id").eq("server_id", activeServer.id),
        supabase.from("custom_emojis").select("id,name,image_url").eq("server_id", activeServer.id),
        supabase.from("server_bots").select("bot_key,enabled").eq("server_id", activeServer.id),
      ]);
      const ch = (chRes.data || []) as Channel[];
      setChannels(ch);
      const mems = (memRes.data || []) as Member[];
      if (mems.length) {
        const { data: profs } = await supabase.from("profiles").select("user_id,username,avatar_url").in("user_id", mems.map((m) => m.user_id));
        const pm = new Map((profs || []).map((p) => [p.user_id, p]));
        setMembers(mems.map((m) => ({ ...m, username: pm.get(m.user_id)?.username, avatar_url: pm.get(m.user_id)?.avatar_url })));
      } else setMembers([]);

      // Build user -> highest role color map
      const roleColor = new Map((rolesRes.data || []).map((r: any) => [r.id, r.color]));
      const colors = new Map<string, string>();
      for (const mr of (mrRes.data || []) as any[]) {
        if (!colors.has(mr.user_id) && roleColor.has(mr.role_id)) colors.set(mr.user_id, roleColor.get(mr.role_id)!);
      }
      setMemberColors(colors);
      setCustomEmojis((emojiRes.data || []) as any);
      const bm = (botsRes.data || []).find((b: any) => b.bot_key === "bloxmod");
      setBloxmodEnabled(!!bm?.enabled);

      if (!activeChannel || activeChannel.server_id !== activeServer.id) {
        setActiveChannel(ch.find((c) => c.type === "text") || ch[0] || null);
      }
    };
    load();
    const sub = supabase.channel(`server-${activeServer.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "channels", filter: `server_id=eq.${activeServer.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "server_members", filter: `server_id=eq.${activeServer.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "server_roles", filter: `server_id=eq.${activeServer.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "server_member_roles", filter: `server_id=eq.${activeServer.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "custom_emojis", filter: `server_id=eq.${activeServer.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "server_bots", filter: `server_id=eq.${activeServer.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
    // eslint-disable-next-line
  }, [activeServer]);

  useEffect(() => {
    if (!activeServer || !user) return;
    const ch = supabase.channel(`presence-${activeServer.id}`, { config: { presence: { key: user.id } } });
    ch.on("presence", { event: "sync" }, () => setOnlineIds(new Set(Object.keys(ch.presenceState())))).subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ at: Date.now() });
    });
    return () => { supabase.removeChannel(ch); };
  }, [activeServer, user]);

  const createServer = async () => {
    if (!newName.trim()) return;
    const { data, error } = await supabase.rpc("create_server", { _name: newName.trim() });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setNewName(""); setCreateOpen(false);
    await loadServers();
    const { data: s } = await supabase.from("servers").select("*").eq("id", data as string).single();
    if (s) setActiveServer(s as Server);
  };
  const joinServer = async () => {
    if (!inviteCode.trim()) return;
    const { data, error } = await supabase.rpc("join_server_by_invite", { _code: inviteCode.trim() });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
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
  const openDM = async (otherId: string) => {
    if (!user || otherId === user.id) return;
    const { data, error } = await supabase.rpc("get_or_create_dm", { _other: otherId });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
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
        onSelect={(id) => { setActiveServer(servers.find((s) => s.id === id) || null); setView("channel"); }}
        onCreate={() => setCreateOpen(true)}
        onJoin={() => setJoinOpen(true)}
      />
      <div className="w-56 shrink-0 bg-card/40 border-r border-border flex flex-col">
        {activeServer ? (
          <>
            <div className="px-3 py-3 border-b border-border flex items-center justify-between">
              <div className="font-semibold text-sm truncate">{activeServer.name}</div>
              {isAdmin && (
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSettingsOpen(true)} title="Server settings">
                  <SettingsIcon className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="px-2 pt-2">
              <button onClick={() => setView("posts")}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm ${view === "posts" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"}`}>
                <Megaphone className="h-4 w-4" /> Posts
              </button>
            </div>
            <ChannelList
              server={activeServer}
              channels={channels}
              activeChannelId={view === "channel" ? activeChannel?.id || null : null}
              isAdmin={isAdmin}
              onSelect={(c) => { setActiveChannel(c); setView("channel"); }}
              onCreateChannel={() => setChanOpen(true)}
              onLeave={leaveServer}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground p-4 text-center">
            Select or create a server
          </div>
        )}
      </div>

      {activeServer ? (
        view === "posts" ? (
          <PostsPanel serverId={activeServer.id} userId={user.id} username={username} isAdmin={isAdmin} />
        ) : activeChannel ? (
          activeChannel.type === "text" ? (
            <ChatRoom
              channelId={activeChannel.id}
              channelName={activeChannel.name}
              serverId={activeServer.id}
              userId={user.id}
              username={username}
              isAdmin={isAdmin}
              bloxmodEnabled={bloxmodEnabled}
              customEmojis={customEmojis}
              memberColors={memberColors}
            />
          ) : (
            <VoiceRoom channelId={activeChannel.id} channelName={activeChannel.name} userId={user.id} username={username} />
          )
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Pick a channel</div>
        )
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Welcome to the community</div>
      )}

      {activeServer && <MemberList members={members} onlineIds={onlineIds} onDM={openDM} />}

      {dm && <DMPanel conversationId={dm.id} otherUserId={dm.otherId} otherName={dm.otherName} userId={user.id} onClose={() => setDm(null)} />}

      {activeServer && (
        <ServerSettings
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          server={activeServer}
          members={members}
          isAdmin={isAdmin}
          isOwner={isOwner}
        />
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
