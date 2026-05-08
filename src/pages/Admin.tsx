import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Flag, Shield, Trash2, UserCheck, Users as UsersIcon, BarChart3, Ban } from "lucide-react";

type UserRow = { user_id: string; username: string | null; rank_points: number; created_at: string };
type Report = { id: string; reason: string; status: string; target_type: string; target_id: string; created_at: string; reporter_id: string };
type Snip = { id: string; title: string; author_name: string; likes: number; views: number };

const AdminPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [admins, setAdmins] = useState<Set<string>>(new Set());
  const [reports, setReports] = useState<Report[]>([]);
  const [snippets, setSnippets] = useState<Snip[]>([]);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ users: 0, snippets: 0, posts: 0, openReports: 0 });

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth"); return; }
    (async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!data) {
        toast({ title: "Access denied", description: "Admin role required", variant: "destructive" });
        navigate("/");
        return;
      }
      setIsAdmin(true);
    })();
  }, [user, loading, navigate]);

  const loadAll = async () => {
    const [u, r, s, p, ar] = await Promise.all([
      supabase.from("profiles").select("user_id,username,rank_points,created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("snippets").select("id,title,author_name,likes,views").order("created_at", { ascending: false }).limit(100),
      supabase.from("forum_posts").select("id", { count: "exact", head: true }),
      supabase.from("user_roles").select("user_id").eq("role", "admin"),
    ]);
    setUsers((u.data || []) as UserRow[]);
    setReports((r.data || []) as Report[]);
    setSnippets((s.data || []) as Snip[]);
    setAdmins(new Set((ar.data || []).map((x: any) => x.user_id)));
    setStats({
      users: u.data?.length || 0,
      snippets: s.data?.length || 0,
      posts: p.count || 0,
      openReports: (r.data || []).filter((x: any) => x.status === "open").length,
    });
  };

  useEffect(() => { if (isAdmin) loadAll(); }, [isAdmin]);

  const grantAdmin = async (uid: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: "admin" });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Granted admin role" });
    loadAll();
  };

  const revokeAdmin = async (uid: string) => {
    if (uid === user?.id) return toast({ title: "Can't revoke yourself", variant: "destructive" });
    const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "admin");
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Admin revoked" });
    loadAll();
  };

  const resolveReport = async (id: string) => {
    const { error } = await supabase.from("reports").update({ status: "resolved" }).eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    loadAll();
  };

  const deleteReport = async (id: string) => {
    await supabase.from("reports").delete().eq("id", id);
    loadAll();
  };

  const deleteSnippet = async (id: string) => {
    if (!confirm("Delete this snippet?")) return;
    const { error } = await supabase.from("snippets").delete().eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Snippet deleted" });
    loadAll();
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
          </div>
          <Button variant="ghost" size="sm" onClick={loadAll}>Refresh</Button>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Users", value: stats.users, icon: UsersIcon, color: "text-cyan-400" },
            { label: "Snippets", value: stats.snippets, icon: BarChart3, color: "text-emerald-400" },
            { label: "Forum Posts", value: stats.posts, icon: BarChart3, color: "text-purple-400" },
            { label: "Open Reports", value: stats.openReports, icon: Flag, color: "text-red-400" },
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

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users"><UsersIcon className="h-4 w-4 mr-2" />Users</TabsTrigger>
            <TabsTrigger value="reports"><Flag className="h-4 w-4 mr-2" />Reports</TabsTrigger>
            <TabsTrigger value="snippets"><BarChart3 className="h-4 w-4 mr-2" />Snippets</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-3">
            <Input placeholder="Search by username..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              {filteredUsers.map((u) => {
                const isA = admins.has(u.user_id);
                return (
                  <div key={u.user_id} className="flex items-center justify-between p-3 gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{u.username || "anonymous"}</p>
                      <p className="text-xs text-muted-foreground">{u.rank_points} pts • joined {new Date(u.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isA && <Badge variant="default">Admin</Badge>}
                      {isA ? (
                        <Button size="sm" variant="ghost" onClick={() => revokeAdmin(u.user_id)}>Revoke</Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => grantAdmin(u.user_id)}><UserCheck className="h-3 w-3 mr-1" />Make admin</Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredUsers.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No users</p>}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-3">
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              {reports.map((r) => (
                <div key={r.id} className="p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={r.status === "open" ? "destructive" : "secondary"}>{r.status}</Badge>
                      <span className="text-xs text-muted-foreground">{r.target_type} • {new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-foreground">{r.reason}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {r.status === "open" && <Button size="sm" variant="outline" onClick={() => resolveReport(r.id)}>Resolve</Button>}
                    <Button size="sm" variant="ghost" onClick={() => deleteReport(r.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
              {reports.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No reports</p>}
            </div>
          </TabsContent>

          <TabsContent value="snippets" className="space-y-3">
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              {snippets.map((s) => (
                <div key={s.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground">by {s.author_name} • {s.likes} likes • {s.views} views</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteSnippet(s.id)}><Trash2 className="h-3 w-3 text-red-400" /></Button>
                </div>
              ))}
              {snippets.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No snippets</p>}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPage;
