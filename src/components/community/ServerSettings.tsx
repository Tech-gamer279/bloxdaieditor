import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, Copy, Plus, Crown, Shield, Hammer, Smile } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Server, Member } from "./types";
import { BUILT_IN_BOTS } from "./bots";

interface Props {
  open: boolean;
  onClose: () => void;
  server: Server;
  members: Member[];
  isAdmin: boolean;
  isOwner: boolean;
}

interface ServerRole { id: string; name: string; color: string; position: number; }
interface Ban { id: string; user_id: string; reason: string | null; expires_at: string | null; }
interface CustomEmoji { id: string; name: string; image_url: string; }
interface ServerBot { id: string; bot_key: string; enabled: boolean; }
interface Report { id: string; reporter_id: string; target_type: string; target_id: string; reason: string; status: string; created_at: string; }

const ServerSettings = ({ open, onClose, server, members, isAdmin, isOwner }: Props) => {
  const [roles, setRoles] = useState<ServerRole[]>([]);
  const [bans, setBans] = useState<Ban[]>([]);
  const [emojis, setEmojis] = useState<CustomEmoji[]>([]);
  const [bots, setBots] = useState<ServerBot[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [memberRoles, setMemberRoles] = useState<{ user_id: string; role_id: string }[]>([]);

  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleColor, setNewRoleColor] = useState("#a78bfa");
  const [newEmojiName, setNewEmojiName] = useState("");
  const [serverName, setServerName] = useState(server.name);

  const reload = async () => {
    const [r, b, e, bo, rep, mr] = await Promise.all([
      supabase.from("server_roles").select("*").eq("server_id", server.id).order("position"),
      supabase.from("server_bans").select("*").eq("server_id", server.id),
      supabase.from("custom_emojis").select("*").eq("server_id", server.id),
      supabase.from("server_bots").select("*").eq("server_id", server.id),
      supabase.from("reports").select("*").eq("server_id", server.id).order("created_at", { ascending: false }),
      supabase.from("server_member_roles").select("user_id, role_id").eq("server_id", server.id),
    ]);
    setRoles((r.data || []) as ServerRole[]);
    setBans((b.data || []) as Ban[]);
    setEmojis((e.data || []) as CustomEmoji[]);
    setBots((bo.data || []) as ServerBot[]);
    setReports((rep.data || []) as Report[]);
    setMemberRoles((mr.data || []) as any);
  };

  useEffect(() => { if (open) { reload(); setServerName(server.name); } }, [open, server.id]);

  const createRole = async () => {
    if (!newRoleName.trim()) return;
    const { error } = await supabase.from("server_roles").insert({
      server_id: server.id, name: newRoleName.trim(), color: newRoleColor, position: roles.length,
    });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setNewRoleName("");
    reload();
  };
  const deleteRole = async (id: string) => {
    await supabase.from("server_roles").delete().eq("id", id);
    reload();
  };
  const toggleMemberRole = async (userId: string, roleId: string) => {
    const has = memberRoles.find((m) => m.user_id === userId && m.role_id === roleId);
    if (has) {
      await supabase.from("server_member_roles").delete().eq("user_id", userId).eq("role_id", roleId);
    } else {
      await supabase.from("server_member_roles").insert({ server_id: server.id, user_id: userId, role_id: roleId });
    }
    reload();
  };

  const unban = async (id: string) => {
    await supabase.from("server_bans").delete().eq("id", id);
    reload();
  };

  const toggleBot = async (botKey: string, enabled: boolean) => {
    const existing = bots.find((b) => b.bot_key === botKey);
    if (existing) {
      await supabase.from("server_bots").update({ enabled }).eq("id", existing.id);
    } else {
      await supabase.from("server_bots").insert({ server_id: server.id, bot_key: botKey, enabled });
    }
    reload();
  };

  const uploadEmoji = async (file: File) => {
    if (!newEmojiName.trim()) return toast({ title: "Name required", variant: "destructive" });
    const path = `${server.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("custom-emojis").upload(path, file);
    if (upErr) return toast({ title: "Error", description: upErr.message, variant: "destructive" });
    const { data: { publicUrl } } = supabase.storage.from("custom-emojis").getPublicUrl(path);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("custom_emojis").insert({
      server_id: server.id, name: newEmojiName.trim(), image_url: publicUrl, created_by: user!.id,
    });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setNewEmojiName("");
    reload();
  };
  const deleteEmoji = async (id: string) => {
    await supabase.from("custom_emojis").delete().eq("id", id);
    reload();
  };

  const updateReport = async (id: string, status: string) => {
    await supabase.from("reports").update({ status }).eq("id", id);
    reload();
  };
  const deleteReport = async (id: string) => {
    await supabase.from("reports").delete().eq("id", id);
    reload();
  };

  const saveServer = async () => {
    if (!isOwner) return;
    await supabase.from("servers").update({ name: serverName }).eq("id", server.id);
    toast({ title: "Saved" });
  };
  const deleteServer = async () => {
    if (!isOwner) return;
    if (!confirm(`Delete server "${server.name}"? This cannot be undone.`)) return;
    await supabase.from("servers").delete().eq("id", server.id);
    onClose();
  };

  const memberName = (id: string) => members.find((m) => m.user_id === id)?.username || id.slice(0, 8);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader><DialogTitle>{server.name} — Settings</DialogTitle></DialogHeader>
        <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="bans">Bans</TabsTrigger>
            <TabsTrigger value="emojis">Emojis</TabsTrigger>
            <TabsTrigger value="bots">Bots</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto py-4">
            <TabsContent value="overview" className="space-y-4 mt-0">
              <div>
                <Label>Server name</Label>
                <Input value={serverName} onChange={(e) => setServerName(e.target.value)} disabled={!isOwner} />
              </div>
              <div>
                <Label>Invite code</Label>
                <div className="flex gap-2">
                  <Input value={server.invite_code} readOnly />
                  <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(server.invite_code); toast({ title: "Copied" }); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                {isOwner && <Button onClick={saveServer}>Save</Button>}
                {isOwner && <Button variant="destructive" onClick={deleteServer}>Delete server</Button>}
              </div>
            </TabsContent>

            <TabsContent value="roles" className="space-y-4 mt-0">
              {isAdmin && (
                <div className="flex gap-2 items-end">
                  <div className="flex-1"><Label>Role name</Label><Input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="Moderator" /></div>
                  <div><Label>Color</Label><Input type="color" value={newRoleColor} onChange={(e) => setNewRoleColor(e.target.value)} className="w-16 p-1" /></div>
                  <Button onClick={createRole}><Plus className="h-4 w-4" /> Add</Button>
                </div>
              )}
              <div className="space-y-2">
                {roles.length === 0 && <p className="text-sm text-muted-foreground">No custom roles yet.</p>}
                {roles.map((r) => (
                  <div key={r.id} className="border border-border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold" style={{ color: r.color }}>● {r.name}</span>
                      {isAdmin && <Button size="icon" variant="ghost" onClick={() => deleteRole(r.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">Assign to members:</div>
                    <div className="flex flex-wrap gap-1">
                      {members.map((m) => {
                        const has = memberRoles.some((mr) => mr.user_id === m.user_id && mr.role_id === r.id);
                        return (
                          <button key={m.user_id} onClick={() => isAdmin && toggleMemberRole(m.user_id, r.id)}
                            className={`text-xs px-2 py-1 rounded border ${has ? "bg-primary/20 border-primary" : "border-border hover:bg-secondary"}`}>
                            {m.username || "anon"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="bans" className="space-y-3 mt-0">
              <p className="text-sm text-muted-foreground">Ban members from chat (use the chat 🔨 icon next to messages, or member list).</p>
              {bans.length === 0 && <p className="text-sm text-muted-foreground">No active bans.</p>}
              {bans.map((b) => (
                <div key={b.id} className="flex items-center justify-between border border-border rounded p-2">
                  <div>
                    <div className="text-sm font-medium">{memberName(b.user_id)}</div>
                    <div className="text-xs text-muted-foreground">{b.reason || "No reason"} • {b.expires_at ? `until ${new Date(b.expires_at).toLocaleString()}` : "permanent"}</div>
                  </div>
                  {isAdmin && <Button size="sm" variant="outline" onClick={() => unban(b.id)}>Unban</Button>}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="emojis" className="space-y-3 mt-0">
              {isAdmin && (
                <div className="flex gap-2 items-end">
                  <div className="flex-1"><Label>Emoji name</Label><Input value={newEmojiName} onChange={(e) => setNewEmojiName(e.target.value)} placeholder="bloxd_happy" /></div>
                  <Label className="cursor-pointer">
                    <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadEmoji(e.target.files[0])} />
                    <Button asChild><span><Smile className="h-4 w-4" /> Upload</span></Button>
                  </Label>
                </div>
              )}
              <div className="grid grid-cols-4 gap-2">
                {emojis.map((e) => (
                  <div key={e.id} className="border border-border rounded p-2 flex flex-col items-center gap-1">
                    <img src={e.image_url} alt={e.name} className="w-10 h-10 object-contain" />
                    <span className="text-xs truncate w-full text-center">:{e.name}:</span>
                    {isAdmin && <button onClick={() => deleteEmoji(e.id)} className="text-destructive text-xs"><Trash2 className="h-3 w-3 inline" /></button>}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="bots" className="space-y-3 mt-0">
              {BUILT_IN_BOTS.map((bot) => {
                const installed = bots.find((b) => b.bot_key === bot.key);
                const enabled = installed?.enabled ?? false;
                return (
                  <div key={bot.key} className="border border-border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{bot.icon}</span>
                        <div>
                          <div className="font-semibold text-sm">{bot.name}</div>
                          <div className="text-xs text-muted-foreground">{bot.description}</div>
                        </div>
                      </div>
                      {isAdmin && <Switch checked={enabled} onCheckedChange={(v) => toggleBot(bot.key, v)} />}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {bot.commands.map((c) => <span key={c} className="text-[10px] bg-secondary px-2 py-0.5 rounded font-mono">{c}</span>)}
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="reports" className="space-y-2 mt-0">
              {reports.length === 0 && <p className="text-sm text-muted-foreground">No reports.</p>}
              {reports.map((r) => (
                <div key={r.id} className="border border-border rounded p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.target_type} report</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${r.status === "open" ? "bg-yellow-500/20 text-yellow-400" : "bg-emerald-500/20 text-emerald-400"}`}>{r.status}</span>
                  </div>
                  <div className="text-muted-foreground text-xs mt-1">By {memberName(r.reporter_id)} • {new Date(r.created_at).toLocaleString()}</div>
                  <div className="mt-1">{r.reason}</div>
                  {isAdmin && (
                    <div className="flex gap-2 mt-2">
                      {r.status === "open" && <Button size="sm" variant="outline" onClick={() => updateReport(r.id, "resolved")}>Resolve</Button>}
                      <Button size="sm" variant="ghost" onClick={() => deleteReport(r.id)}><Trash2 className="h-3 w-3" /> Delete</Button>
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ServerSettings;
