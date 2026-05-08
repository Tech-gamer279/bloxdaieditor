import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { profilesApi, snippetsApi, forumApi, notifyChange } from "@/lib/demo-data";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Flag, Shield, Trash2, UserCheck, Users as UsersIcon, BarChart3 } from "lucide-react";

type UserRow = { user_id: string; username: string | null; rank_points: number; created_at: string };
type Snip = { id: string; title: string; author_name: string; likes: number; views: number };

// Store admin status in localStorage (demo mode)
const ADMINS_KEY = 'bloxd_demo_admins';

const getAdmins = (): Set<string> => {
  try {
    const stored = localStorage.getItem(ADMINS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

const saveAdmins = (admins: Set<string>) => {
  localStorage.setItem(ADMINS_KEY, JSON.stringify([...admins]));
};

const AdminPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [admins, setAdmins] = useState<Set<string>>(new Set());
  const [snippets, setSnippets] = useState<Snip[]>([]);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ users: 0, snippets: 0, posts: 0, openReports: 0 });

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth"); return; }
    
    // In demo mode, first user to visit admin page becomes admin
    const currentAdmins = getAdmins();
    if (currentAdmins.size === 0) {
      currentAdmins.add(user.id);
      saveAdmins(currentAdmins);
    }
    
    if (currentAdmins.has(user.id)) {
      setIsAdmin(true);
    } else {
      toast({ title: "Access denied", description: "Admin role required", variant: "destructive" });
      navigate("/");
    }
  }, [user, loading, navigate]);

  const loadAll = () => {
    const profiles = profilesApi.getAll();
    const allSnippets = snippetsApi.getAll();
    const posts = forumApi.getAll();
    const currentAdmins = getAdmins();
    
    setUsers(profiles.map(p => ({
      user_id: p.user_id,
      username: p.username,
      rank_points: p.rank_points,
      created_at: new Date().toISOString(), // Demo - no created_at in profiles
    })));
    
    setSnippets(allSnippets.map(s => ({
      id: s.id,
      title: s.title,
      author_name: s.author_name,
      likes: s.likes,
      views: s.views,
    })));
    
    setAdmins(currentAdmins);
    
    setStats({
      users: profiles.length,
      snippets: allSnippets.length,
      posts: posts.length,
      openReports: 0, // Demo - no reports
    });
  };

  useEffect(() => { if (isAdmin) loadAll(); }, [isAdmin]);

  const grantAdmin = (uid: string) => {
    const currentAdmins = getAdmins();
    currentAdmins.add(uid);
    saveAdmins(currentAdmins);
    setAdmins(new Set(currentAdmins));
    toast({ title: "Granted admin role" });
  };

  const revokeAdmin = (uid: string) => {
    if (uid === user?.id) return toast({ title: "Can't revoke yourself", variant: "destructive" });
    const currentAdmins = getAdmins();
    currentAdmins.delete(uid);
    saveAdmins(currentAdmins);
    setAdmins(new Set(currentAdmins));
    toast({ title: "Admin revoked" });
  };

  const deleteSnippet = (id: string) => {
    if (!confirm("Delete this snippet?")) return;
    snippetsApi.delete(id);
    notifyChange();
    loadAll();
    toast({ title: "Snippet deleted" });
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
            <Badge variant="outline" className="text-xs">Demo Mode</Badge>
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
                      <p className="text-xs text-muted-foreground">{u.rank_points} pts</p>
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

          <TabsContent value="snippets" className="space-y-3">
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              {snippets.map((s) => (
                <div key={s.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground">by {s.author_name} - {s.likes} likes - {s.views} views</p>
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
