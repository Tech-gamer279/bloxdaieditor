import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useApi, apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Download, Heart, Plus, Trash2, Puzzle, ArrowLeft, Clock, Tag } from "lucide-react";

type Mod = {
  id: string; userId: string; authorName: string; title: string;
  description: string | null; version: string; fileUrl: string | null;
  fileName: string | null; previewUrl: string | null;
  downloads: number; likes: number; createdAt: string; liked: boolean;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const Mods = () => {
  const { user } = useAuth();
  const api = useApi();
  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", version: "1.0.0", fileUrl: "", fileName: "", previewUrl: "" });

  const fetchMods = useCallback(async () => {
    try {
      const data = await apiFetch("/mods");
      setMods(data as Mod[]);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchMods(); }, [fetchMods]);

  const handleUpload = async () => {
    if (!user) { toast({ title: "Sign in required", variant: "destructive" }); return; }
    if (!form.title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const m = await api("/mods", {
        method: "POST",
        body: JSON.stringify({ title: form.title, description: form.description, version: form.version, file_url: form.fileUrl, file_name: form.fileName, preview_url: form.previewUrl }),
      }) as Mod;
      setMods((prev) => [m, ...prev]);
      setForm({ title: "", description: "", version: "1.0.0", fileUrl: "", fileName: "", previewUrl: "" });
      setShowUpload(false);
      toast({ title: "Mod shared!" });
    } catch (e: unknown) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  const handleLike = async (id: string) => {
    if (!user) { toast({ title: "Sign in required", variant: "destructive" }); return; }
    try {
      const result = await api(`/mods/${id}/like`, { method: "POST" }) as { liked: boolean };
      setMods((prev) => prev.map((m) => m.id === id ? { ...m, liked: result.liked, likes: result.liked ? m.likes + 1 : m.likes - 1 } : m));
    } catch {}
  };

  const handleDownload = async (m: Mod) => {
    await apiFetch(`/mods/${m.id}/download`, { method: "POST" }).catch(() => {});
    setMods((prev) => prev.map((mod) => mod.id === m.id ? { ...mod, downloads: mod.downloads + 1 } : mod));
    if (m.fileUrl) {
      window.open(m.fileUrl, "_blank");
    } else {
      toast({ title: "No file attached", description: "The author hasn't uploaded a file for this mod." });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this mod?")) return;
    try {
      await api(`/mods/${id}`, { method: "DELETE" });
      setMods((prev) => prev.filter((m) => m.id !== id));
      toast({ title: "Deleted" });
    } catch {}
  };

  if (showUpload) {
    return (
      <div className="space-y-4 max-w-xl">
        <button onClick={() => setShowUpload(false)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to mods
        </button>
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-foreground">Share a Mod</h2>
          <p className="text-xs text-muted-foreground">Share your Bloxd mod with the community. Paste a link to your mod file (e.g. from Pastebin, GitHub, or a direct URL).</p>
          <div className="space-y-2">
            <label className="text-sm font-medium">Title *</label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="My awesome mod" maxLength={200} className="bg-secondary/30" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Version</label>
            <Input value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} placeholder="1.0.0" maxLength={20} className="bg-secondary/30" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What does your mod do?" rows={3} maxLength={1000} className="bg-secondary/30 resize-none" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">File URL</label>
            <Input value={form.fileUrl} onChange={(e) => setForm((f) => ({ ...f, fileUrl: e.target.value }))} placeholder="https://..." className="bg-secondary/30" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">File Name</label>
            <Input value={form.fileName} onChange={(e) => setForm((f) => ({ ...f, fileName: e.target.value }))} placeholder="my_mod.js" className="bg-secondary/30" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Preview Image URL</label>
            <Input value={form.previewUrl} onChange={(e) => setForm((f) => ({ ...f, previewUrl: e.target.value }))} placeholder="https://... (optional screenshot)" className="bg-secondary/30" />
          </div>
          <Button variant="neon" onClick={handleUpload} disabled={submitting} className="w-full">
            {submitting ? "Sharing..." : "Share Mod"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Puzzle className="h-4 w-4" /> Mods
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Share and download Bloxd mods</p>
        </div>
        <Button variant="neon" size="sm" onClick={() => {
          if (!user) { toast({ title: "Sign in required", variant: "destructive" }); return; }
          setShowUpload(true);
        }}>
          <Plus className="h-4 w-4" /> Share Mod
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm animate-pulse">Loading mods...</div>
      ) : mods.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Puzzle className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No mods shared yet</p>
          <p className="text-xs mt-1">Be the first to share a Bloxd mod!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mods.map((m) => (
            <div key={m.id} className="rounded-lg border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors">
              {m.previewUrl ? (
                <div className="aspect-video bg-secondary/30 overflow-hidden">
                  <img src={m.previewUrl} alt={m.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
              ) : (
                <div className="aspect-video bg-secondary/30 flex items-center justify-center">
                  <Puzzle className="h-10 w-10 text-muted-foreground/30" />
                </div>
              )}
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{m.title}</h3>
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400 mt-0.5">
                      <Tag className="h-3 w-3" /> v{m.version}
                    </span>
                  </div>
                  {user?.id === m.userId && (
                    <button onClick={() => handleDelete(m.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {m.description && <p className="text-xs text-muted-foreground line-clamp-2">{m.description}</p>}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-primary/70">@{m.authorName}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(m.createdAt)}</span>
                </div>
                {m.fileName && <p className="text-xs text-muted-foreground truncate">📎 {m.fileName}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <Button size="sm" variant="neon" className="flex-1 h-8" onClick={() => handleDownload(m)}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Download ({m.downloads})
                  </Button>
                  <button
                    onClick={() => handleLike(m.id)}
                    className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded border transition-colors ${m.liked ? "text-red-500 border-red-500/30 bg-red-500/10" : "text-muted-foreground border-border hover:text-red-400"}`}
                  >
                    <Heart className={`h-3.5 w-3.5 ${m.liked ? "fill-current" : ""}`} /> {m.likes}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Mods;
