import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useApi, apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Shield, Trash2, UserCheck, Users as UsersIcon,
  BarChart3, Award, Plus, X,
} from "lucide-react";

type UserRow = { userId: string; username: string | null; rankPoints: number };
type SnipRow = { id: string; title: string; authorName: string; likes: number; views: number };
type BadgeDef = { id: string; name: string; description: string; emoji: string; color: string };
type UserBadge = { id: string; userId: string; badgeId: string; badge: BadgeDef };

const AdminPage = () => {
  const { user, loading } = useAuth();
  const api = useApi();
  const [, navigate] = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminUserIds, setAdminUserIds] = useState<Set<string>>(new Set());
  const [users, setUsers] = useState<UserRow[]>([]);
  const [snippets, setSnippets] = useState<SnipRow[]>([]);
  const [badges, setBadges] = useState<BadgeDef[]>([]);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ users: 0, snippets: 0, badges: 0 });

  // Badge form
  const [newBadgeName, setNewBadgeName] = useState("");
  const [newBadgeDesc, setNewBadgeDesc] = useState("");
  const [newBadgeEmoji, setNewBadgeEmoji] = useState("🏅");
  const [newBadgeColor, setNewBadgeColor] = useState("#6366f1");

  // Grant badge form
  const [grantUserId, setGrantUserId] = useState("");
  const [grantBadgeId, setGrantBadgeId] = useState("");
  const [grantUsername, setGrantUsername] = useState("");
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [lookingUpUser, setLookingUpUser] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/sign-in"); return; }
    api("/admin/check")
      .then((data) => {
        if ((data as { isAdmin: boolean }).isAdmin) { setIsAdmin(true); }
        else { toast({ title: "Access denied", variant: "destructive" }); navigate("/"); }
      })
      .catch(() => { toast({ title: "Error verifying admin", variant: "destructive" }); navigate("/"); });
  }, [user, loading]);

  const loadAll = useCallback(async () => {
    try {
      const [usersData, snipsData, adminsData, badgesData] = await Promise.all([
        apiFetch("/profiles/top").catch(() => []),
        apiFetch("/snippets").catch(() => []),
        api("/admin/admins").catch(() => []),
        apiFetch("/badges").catch(() => []),
      ]);
      const adminIds = new Set(((adminsData as { userId: string }[]) || []).map((a) => a.userId));
      setAdminUserIds(adminIds);
      setUsers(((usersData as UserRow[]) || []).map((u) => ({ userId: u.userId, username: u.username, rankPoints: u.rankPoints })));
      setSnippets(((snipsData as SnipRow[]) || []).map((s) => ({ id: s.id, title: s.title, authorName: s.authorName, likes: s.likes, views: s.views })));
      setBadges(badgesData as BadgeDef[]);
      setStats({ users: (usersData as UserRow[]).length, snippets: (snipsData as SnipRow[]).length, badges: (badgesData as BadgeDef[]).length });
    } catch {}
  }, []);

  useEffect(() => { if (isAdmin) loadAll(); }, [isAdmin, loadAll]);

  const grantAdmin = async (uid: string) => {
    try { await api("/admin/grant", { method: "POST", body: JSON.stringify({ user_id: uid }) }); toast({ title: "Admin granted" }); loadAll(); }
    catch (e: unknown) { toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }); }
  };
  const revokeAdmin = async (uid: string) => {
    if (uid === user?.id) { toast({ title: "Can't revoke yourself", variant: "destructive" }); return; }
    try { await api(`/admin/revoke/${uid}`, { method: "DELETE" }); toast({ title: "Admin revoked" }); loadAll(); }
    catch (e: unknown) { toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }); }
  };
  const deleteSnippet = async (id: string) => {
    if (!confirm("Delete this snippet?")) return;
    try { await api(`/snippets/${id}`, { method: "DELETE" }); setSnippets((p) => p.filter((s) => s.id !== id)); toast({ title: "Snippet deleted" }); }
    catch {}
  };
  const createBadge = async () => {
    if (!newBadgeName.trim() || !newBadgeDesc.trim()) { toast({ title: "Name and description required", variant: "destructive" }); return; }
    try {
      const b = await api("/badges", { method: "POST", body: JSON.stringify({ name: newBadgeName, description: newBadgeDesc, emoji: newBadgeEmoji, color: newBadgeColor }) }) as BadgeDef;
      setBadges((p) => [...p, b]);
      setNewBadgeName(""); setNewBadgeDesc(""); setNewBadgeEmoji("🏅"); setNewBadgeColor("#6366f1");
      setStats((s) => ({ ...s, badges: s.badges + 1 }));
      toast({ title: "Badge created!" });
    } catch (e: unknown) { toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }); }
  };
  const deleteBadge = async (id: string) => {
    if (!confirm("Delete this badge? It will be removed from all users.")) return;
    try { await api(`/badges/${id}`, { method: "DELETE" }); setBadges((p) => p.filter((b) => b.id !== id)); toast({ title: "Badge deleted" }); }
    catch {}
  };
  const lookupUser = async () => {
    const trimmed = grantUsername.trim();
    if (!trimmed) return;
    setLookingUpUser(true);
    try {
      const data = await apiFetch(`/profiles/by-username/${encodeURIComponent(trimmed)}`) as { profile: UserRow };
      setGrantUserId(data.profile.userId);
      const ubs = await apiFetch(`/badges/user/${data.profile.userId}`) as UserBadge[];
      setUserBadges(ubs);
      toast({ title: `Found user: ${data.profile.username}` });
    } catch { toast({ title: "User not found", variant: "destructive" }); setGrantUserId(""); setUserBadges([]); }
    setLookingUpUser(false);
  };
  const grantBadge = async () => {
    if (!grantUserId || !grantBadgeId) { toast({ title: "Select a user and badge", variant: "destructive" }); return; }
    try {
      await api("/badges/grant", { method: "POST", body: JSON.stringify({ user_id: grantUserId, badge_id: grantBadgeId }) });
      const ubs = await apiFetch(`/badges/user/${grantUserId}`) as UserBadge[];
      setUserBadges(ubs);
      toast({ title: "Badge granted!" });
    } catch (e: unknown) { toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }); }
  };
  const revokeBadge = async (userBadgeId: string) => {
    try {
      await api(`/badges/revoke/${userBadgeId}`, { method: "DELETE" });
      setUserBadges((p) => p.filter((ub) => ub.id !== userBadgeId));
      toast({ title: "Badge revoked" });
    } catch {}
  };

  if (!user || isAdmin !== true) return null;
  const filteredUsers = users.filter((u) => !search || (u.username || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4 mr-1" /> Home</Button>
            <h1 className="text-lg font-bold flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Admin Dashboard</h1>
            <Badge variant="outline" className="text-xs text-primary border-primary/30">Owner Access</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={loadAll}>Refresh</Button>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Users", value: stats.users, icon: UsersIcon, color: "text-cyan-400" },
            { label: "Snippets", value: stats.snippets, icon: BarChart3, color: "text-emerald-400" },
            { label: "Badges", value: stats.badges, icon: Award, color: "text-yellow-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
              <s.icon className={`h-8 w-8 ${s.color}`} />
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="badges">
          <TabsList>
            <TabsTrigger value="badges"><Award className="h-4 w-4 mr-2" />Badges</TabsTrigger>
            <TabsTrigger value="users"><UsersIcon className="h-4 w-4 mr-2" />Users</TabsTrigger>
            <TabsTrigger value="snippets"><BarChart3 className="h-4 w-4 mr-2" />Snippets</TabsTrigger>
          </TabsList>

          {/* ── Badges tab ── */}
          <TabsContent value="badges" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Create badge */}
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <h2 className="font-semibold text-foreground flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> Create Badge</h2>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Emoji</label>
                    <Input value={newBadgeEmoji} onChange={(e) => setNewBadgeEmoji(e.target.value)} placeholder="🏅" maxLength={4} className="text-lg text-center" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Color</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={newBadgeColor} onChange={(e) => setNewBadgeColor(e.target.value)} className="h-9 w-12 rounded border border-border cursor-pointer bg-transparent" />
                      <Input value={newBadgeColor} onChange={(e) => setNewBadgeColor(e.target.value)} placeholder="#6366f1" className="flex-1 font-mono text-sm" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Name *</label>
                  <Input value={newBadgeName} onChange={(e) => setNewBadgeName(e.target.value)} placeholder="e.g. Top Contributor" maxLength={50} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Description *</label>
                  <Textarea value={newBadgeDesc} onChange={(e) => setNewBadgeDesc(e.target.value)} placeholder="What does this badge represent?" rows={2} maxLength={200} className="resize-none" />
                </div>
                {newBadgeName && (
                  <div className="p-3 rounded-lg bg-secondary/30 flex items-center gap-2">
                    <span className="text-lg">{newBadgeEmoji}</span>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium" style={{ borderColor: newBadgeColor + "55", backgroundColor: newBadgeColor + "15", color: newBadgeColor }}>
                      {newBadgeName}
                    </div>
                    <span className="text-xs text-muted-foreground ml-1">Preview</span>
                  </div>
                )}
                <Button variant="neon" onClick={createBadge} className="w-full"><Plus className="h-4 w-4 mr-1" /> Create Badge</Button>
              </div>

              {/* Grant badge to user */}
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <h2 className="font-semibold text-foreground flex items-center gap-2"><Award className="h-4 w-4 text-yellow-400" /> Grant / Revoke Badge</h2>
                <div className="flex gap-2">
                  <Input value={grantUsername} onChange={(e) => setGrantUsername(e.target.value)} onKeyDown={(e) => e.key === "Enter" && lookupUser()} placeholder="Username to look up" />
                  <Button size="sm" variant="outline" onClick={lookupUser} disabled={lookingUpUser}>
                    {lookingUpUser ? "..." : "Find"}
                  </Button>
                </div>
                {grantUserId && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Select Badge to Grant</label>
                      <select value={grantBadgeId} onChange={(e) => setGrantBadgeId(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                        <option value="">— pick a badge —</option>
                        {badges.map((b) => <option key={b.id} value={b.id}>{b.emoji} {b.name}</option>)}
                      </select>
                    </div>
                    <Button variant="neon" size="sm" onClick={grantBadge} disabled={!grantBadgeId} className="w-full">Grant Badge</Button>
                    {userBadges.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Current Badges</p>
                        {userBadges.map((ub) => (
                          <div key={ub.id} className="flex items-center justify-between p-2 rounded border border-border bg-secondary/20">
                            <div className="flex items-center gap-2 text-sm" style={{ color: ub.badge.color }}>
                              <span>{ub.badge.emoji}</span><span className="font-medium">{ub.badge.name}</span>
                            </div>
                            <button onClick={() => revokeBadge(ub.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors" title="Revoke">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {userBadges.length === 0 && <p className="text-xs text-muted-foreground">User has no badges yet.</p>}
                  </>
                )}
              </div>
            </div>

            {/* All badges list */}
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              <div className="px-4 py-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">All Badges ({badges.length})</p>
              </div>
              {badges.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">No badges created yet.</p>
              ) : (
                badges.map((b) => (
                  <div key={b.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl">{b.emoji}</span>
                      <div>
                        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border text-sm font-medium w-fit" style={{ borderColor: b.color + "55", backgroundColor: b.color + "15", color: b.color }}>{b.name}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">{b.description}</p>
                      </div>
                    </div>
                    <button onClick={() => deleteBadge(b.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors shrink-0" title="Delete badge">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* ── Users tab ── */}
          <TabsContent value="users" className="space-y-3">
            <Input placeholder="Search by username..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              {filteredUsers.map((u) => {
                const isA = adminUserIds.has(u.userId);
                const isYou = u.userId === user.id;
                return (
                  <div key={u.userId} className="flex items-center justify-between p-3 gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{u.username || "anonymous"}{isYou ? " (you)" : ""}</p>
                      <p className="text-xs text-muted-foreground">{u.rankPoints} pts</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isA && <Badge variant="default" className="text-xs">Admin</Badge>}
                      {!isYou && (
                        isA
                          ? <Button size="sm" variant="ghost" onClick={() => revokeAdmin(u.userId)}>Revoke</Button>
                          : <Button size="sm" variant="outline" onClick={() => grantAdmin(u.userId)}><UserCheck className="h-3 w-3 mr-1" />Make Admin</Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredUsers.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No users yet</p>}
            </div>
          </TabsContent>

          {/* ── Snippets tab ── */}
          <TabsContent value="snippets" className="space-y-3">
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              {snippets.map((s) => (
                <div key={s.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground">by {s.authorName} · {s.likes} likes · {s.views} views</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteSnippet(s.id)}><Trash2 className="h-3 w-3 text-red-400" /></Button>
                </div>
              ))}
              {snippets.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No snippets yet</p>}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPage;
