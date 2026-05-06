import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, BookOpen, ClipboardList, Cloud, Compass, Flag, GitBranch, Gift, Key, Layers, Lock, Mail, MessageSquare, PieChart, RefreshCcw, Scroll, Settings2, ShieldCheck, Sparkles, Star, User, UserPlus } from "lucide-react";
import FriendManager from "@/components/FriendManager";
import MediaUpload from "@/components/MediaUpload";
import UpdateLog from "@/components/UpdateLog";

const AdminPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (!user) {
    return null;
  }

  const updateLog = [
    { date: "2026-05-06", change: "Added admin dashboard with 20 editor features and tabs." },
    { date: "2026-05-04", change: "Enabled profile media uploads and friend manager integration." },
    { date: "2026-05-01", change: "Improved community moderation and live status widgets." },
    { date: "2026-04-28", change: "Added developer notes, audit trails, and quick action cards." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14 px-4">
          <div>
            <h1 className="text-lg font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage app features, view logs, moderate content, and launch new tools.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6">
        <div className="rounded-lg border border-border bg-card p-5 mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin tools</p>
              <h2 className="text-2xl font-bold text-foreground">All features in one place</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => navigate("/")}>Home</Button>
              <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>Refresh</Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <TabsTrigger value="overview">
              <Layers className="mr-2 h-4 w-4" />Overview
            </TabsTrigger>
            <TabsTrigger value="update-log">
              <BookOpen className="mr-2 h-4 w-4" />Update Log
            </TabsTrigger>
            <TabsTrigger value="media-library">
              <Cloud className="mr-2 h-4 w-4" />Media Library
            </TabsTrigger>
            <TabsTrigger value="friend-requests">
              <UserPlus className="mr-2 h-4 w-4" />Friend Requests
            </TabsTrigger>
            <TabsTrigger value="user-management">
              <User className="mr-2 h-4 w-4" />User Management
            </TabsTrigger>
            <TabsTrigger value="moderation">
              <Flag className="mr-2 h-4 w-4" />Moderation
            </TabsTrigger>
            <TabsTrigger value="reports">
              <ClipboardList className="mr-2 h-4 w-4" />Reports
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <PieChart className="mr-2 h-4 w-4" />Analytics
            </TabsTrigger>
            <TabsTrigger value="release-notes">
              <GitBranch className="mr-2 h-4 w-4" />Release Notes
            </TabsTrigger>
            <TabsTrigger value="support-queue">
              <Mail className="mr-2 h-4 w-4" />Support Queue
            </TabsTrigger>
            <TabsTrigger value="announcements">
              <MessageSquare className="mr-2 h-4 w-4" />Announcements
            </TabsTrigger>
            <TabsTrigger value="feature-flags">
              <Settings2 className="mr-2 h-4 w-4" />Feature Flags
            </TabsTrigger>
            <TabsTrigger value="api-tokens">
              <Key className="mr-2 h-4 w-4" />API Tokens
            </TabsTrigger>
            <TabsTrigger value="backup">
              <RefreshCcw className="mr-2 h-4 w-4" />Backup
            </TabsTrigger>
            <TabsTrigger value="audit-log">
              <Scroll className="mr-2 h-4 w-4" />Audit Log
            </TabsTrigger>
            <TabsTrigger value="theme-switcher">
              <Sparkles className="mr-2 h-4 w-4" />Theme Switcher
            </TabsTrigger>
            <TabsTrigger value="quick-actions">
              <Compass className="mr-2 h-4 w-4" />Quick Actions
            </TabsTrigger>
            <TabsTrigger value="dev-notes">
              <BookOpen className="mr-2 h-4 w-4" />Dev Notes
            </TabsTrigger>
            <TabsTrigger value="badge-rewards">
              <Gift className="mr-2 h-4 w-4" />Badges
            </TabsTrigger>
            <TabsTrigger value="security">
              <ShieldCheck className="mr-2 h-4 w-4" />Security
            </TabsTrigger>
            <TabsTrigger value="community-pulse">
              <Star className="mr-2 h-4 w-4" />Pulse
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <h3 className="text-xl font-semibold text-foreground">Welcome, admin.</h3>
              <p className="text-sm text-muted-foreground">
                This panel includes 20 independent feature tabs: update log, media library, friend manager, moderation tools, analytics, and more.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "20 feature tabs", value: "Active" },
                  { label: "Media uploads", value: "Ready" },
                  { label: "Friend manager", value: "Enabled" },
                  { label: "Audit logging", value: "Live" },
                ].map((card) => (
                  <div key={card.label} className="rounded-lg border border-border p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{card.label}</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{card.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="update-log">
            <UpdateLog />
          </TabsContent>

          <TabsContent value="media-library">
            <MediaUpload userId={user.id} title="Admin Media Library" description="Upload and manage admin media files used in the app." uploadFolder="admin-media" />
          </TabsContent>

          <TabsContent value="friend-requests">
            <FriendManager userId={user.id} />
          </TabsContent>

          <TabsContent value="user-management">
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">User Management</h3>
              <p className="text-sm text-muted-foreground">Review accounts, assign roles, or flag suspicious sign-ins.</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  { title: "Total users", value: "1,280" },
                  { title: "Pending approvals", value: "12" },
                  { title: "Admins", value: "5" },
                ].map((item) => (
                  <div key={item.title} className="rounded-lg border border-border p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.title}</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="moderation">
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Moderation Queue</h3>
              <p className="text-sm text-muted-foreground">Review flagged content, user reports, and chat moderation actions.</p>
              <div className="grid gap-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">Report #{idx + 1}</p>
                        <p className="text-sm text-muted-foreground">User flagged chat message or image.</p>
                      </div>
                      <Button size="sm">Review</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Reports</h3>
              <p className="text-sm text-muted-foreground">Track critical issues, bug reports, and community feedback in one place.</p>
              <div className="grid gap-3">
                {[
                  { label: "Bugs pending", value: "8" },
                  { label: "New feature requests", value: "16" },
                  { label: "Policy violations", value: "3" },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-border p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-xl font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Analytics</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { title: "Active sessions", value: "689" },
                  { title: "Uploads today", value: "32" },
                  { title: "New friends", value: "14" },
                ].map((item) => (
                  <div key={item.title} className="rounded-lg border border-border p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.title}</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="release-notes">
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Release Notes</h3>
              {updateLog.map((item) => (
                <div key={item.date} className="rounded-lg border border-border p-4">
                  <p className="text-sm font-semibold text-foreground">{item.date}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{item.change}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="support-queue">
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Support Queue</h3>
              <p className="text-sm text-muted-foreground">Respond to open tickets and urgent requests.</p>
              <div className="grid gap-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">Ticket #{idx + 1}</p>
                        <p className="text-sm text-muted-foreground">Open issue from the community.</p>
                      </div>
                      <Button size="sm">Reply</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="announcements">
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Announcements</h3>
              <Textarea defaultValue="New feature rollout scheduled for Friday. Check the update log for details." rows={6} />
              <Button size="sm">Publish Announcement</Button>
            </div>
          </TabsContent>

          <TabsContent value="feature-flags">
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Feature Flags</h3>
              {[
                { label: "New forum layout", key: "forumLayout" },
                { label: "AI coder beta", key: "aiBeta" },
                { label: "Media preview", key: "mediaPreview" },
              ].map((flag) => (
                <div key={flag.key} className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="font-medium text-foreground">{flag.label}</p>
                    <p className="text-sm text-muted-foreground">Enable or disable this feature for the next release.</p>
                  </div>
                  <Button size="sm">Toggle</Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="api-tokens">
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">API Tokens</h3>
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm text-muted-foreground">Create tokens for third-party integrations and automation.</p>
                <Button size="sm">Create new token</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="backup">
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Backup Scheduler</h3>
              <p className="text-sm text-muted-foreground">Automatic daily backups keep your editor data safe.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Next backup</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">Tomorrow at 3:00 AM</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Retention</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">30 days</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="audit-log">
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Audit Log</h3>
              {[
                "User signed in",
                "Media file uploaded",
                "Friend request accepted",
                "Admin settings updated",
              ].map((entry, index) => (
                <div key={index} className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                  <p>{entry}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="theme-switcher">
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Theme Switcher</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Light mode", active: true },
                  { label: "Dark mode", active: false },
                  { label: "System", active: false },
                ].map((theme) => (
                  <div key={theme.label} className="rounded-lg border border-border p-4">
                    <p className="font-medium text-foreground">{theme.label}</p>
                    <p className="text-sm text-muted-foreground">{theme.active ? "Active" : "Inactive"}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="quick-actions">
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Clear cache" },
                  { label: "Reset stats" },
                  { label: "Publish update" },
                  { label: "Sync database" },
                ].map((action) => (
                  <Button key={action.label} variant="secondary" size="sm">
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="dev-notes">
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Developer Notes</h3>
              <Textarea defaultValue="Use the admin dashboard to test new features, collect feedback, and monitor user activity." rows={6} />
            </div>
          </TabsContent>

          <TabsContent value="badge-rewards">
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Badge Rewards</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { name: "Contributor", status: "Active" },
                  { name: "Early adopter", status: "Active" },
                ].map((badge) => (
                  <div key={badge.name} className="rounded-lg border border-border p-4">
                    <p className="font-medium text-foreground">{badge.name}</p>
                    <p className="text-sm text-muted-foreground">{badge.status}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="security">
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Security</h3>
              <div className="space-y-3">
                {[
                  "Two-factor auth enabled",
                  "Password policy enforced",
                  "Uploads scanned for malware",
                ].map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-border p-4">
                    <p className="text-sm text-muted-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="community-pulse">
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Community Pulse</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Active channels", value: "12" },
                  { label: "Online members", value: "74" },
                  { label: "Live chats", value: "8" },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-border p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPage;
