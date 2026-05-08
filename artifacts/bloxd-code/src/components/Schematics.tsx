import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useApi, apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Download, Heart, Plus, Trash2, MapPin, ArrowLeft, Clock } from "lucide-react";

type Schematic = {
  id: string; userId: string; authorName: string; title: string;
  description: string | null; fileUrl: string | null; fileName: string | null;
  previewUrl: string | null; downloads: number; likes: number;
  createdAt: string; liked: boolean;
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

const Schematics = () => {
  const { user } = useAuth();
  const api = useApi();
  const [schematics, setSchematics] = useState<Schematic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", fileUrl: "", fileName: "", previewUrl: "" });

  const fetchSchematics = useCallback(async () => {
    try {
      const data = await apiFetch("/schematics");
      setSchematics(data as Schematic[]);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchSchematics(); }, [fetchSchematics]);

  const handleUpload = async () => {
    if (!user) { toast({ title: "Sign in required", variant: "destructive" }); return; }
    if (!form.title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const s = await api("/schematics", {
        method: "POST",
        body: JSON.stringify({ title: form.title, description: form.description, file_url: form.fileUrl, file_name: form.fileName, preview_url: form.previewUrl }),
      }) as Schematic;
      setSchematics((prev) => [s, ...prev]);
      setForm({ title: "", description: "", fileUrl: "", fileName: "", previewUrl: "" });
      setShowUpload(false);
      toast({ title: "Schematic shared!" });
    } catch (e: unknown) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  const handleLike = async (id: string) => {
    if (!user) { toast({ title: "Sign in required", variant: "destructive" }); return; }
    try {
      const result = await api(`/schematics/${id}/like`, { method: "POST" }) as { liked: boolean };
      setSchematics((prev) => prev.map((s) => s.id === id ? { ...s, liked: result.liked, likes: result.liked ? s.likes + 1 : s.likes - 1 } : s));
    } catch {}
  };

  const handleDownload = async (s: Schematic) => {
    await apiFetch(`/schematics/${s.id}/download`, { method: "POST" }).catch(() => {});
    setSchematics((prev) => prev.map((sc) => sc.id === s.id ? { ...sc, downloads: sc.downloads + 1 } : sc));
    if (s.fileUrl) {
      window.open(s.fileUrl, "_blank");
    } else {
      toast({ title: "No file attached", description: "The author hasn't uploaded a file for this schematic." });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this schematic?")) return;
    try {
      await api(`/schematics/${id}`, { method: "DELETE" });
      setSchematics((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Deleted" });
    } catch {}
  };

  if (showUpload) {
    return (
      <div className="space-y-4 max-w-xl">
        <button onClick={() => setShowUpload(false)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to schematics
        </button>
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-foreground">Share a Schematic</h2>
          <p className="text-xs text-muted-foreground">Share your Bloxd world builds with the community. Paste a link to your schematic file (e.g. from Pastebin, Google Drive, or a direct URL).</p>
          <div className="space-y-2">
            <label className="text-sm font-medium">Title *</label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="My awesome build" maxLength={200} className="bg-secondary/30" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe your build..." rows={3} maxLength={1000} className="bg-secondary/30 resize-none" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">File URL</label>
            <Input value={form.fileUrl} onChange={(e) => setForm((f) => ({ ...f, fileUrl: e.target.value }))} placeholder="https://..." className="bg-secondary/30" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">File Name</label>
            <Input value={form.fileName} onChange={(e) => setForm((f) => ({ ...f, fileName: e.target.value }))} placeholder="my_build.json" className="bg-secondary/30" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Preview Image URL</label>
            <Input value={form.previewUrl} onChange={(e) => setForm((f) => ({ ...f, previewUrl: e.target.value }))} placeholder="https://... (optional screenshot)" className="bg-secondary/30" />
          </div>
          <Button variant="neon" onClick={handleUpload} disabled={submitting} className="w-full">
            {submitting ? "Sharing..." : "Share Schematic"}
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
            <MapPin className="h-4 w-4" /> Schematics
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Share and download Bloxd world builds</p>
        </div>
        <Button variant="neon" size="sm" onClick={() => {
          if (!user) { toast({ title: "Sign in required", variant: "destructive" }); return; }
          setShowUpload(true);
        }}>
          <Plus className="h-4 w-4" /> Share Build
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm animate-pulse">Loading schematics...</div>
      ) : schematics.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MapPin className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No schematics shared yet</p>
          <p className="text-xs mt-1">Be the first to share a Bloxd build!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schematics.map((s) => (
            <div key={s.id} className="rounded-lg border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors">
              {s.previewUrl ? (
                <div className="aspect-video bg-secondary/30 overflow-hidden">
                  <img src={s.previewUrl} alt={s.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
              ) : (
                <div className="aspect-video bg-secondary/30 flex items-center justify-center">
                  <MapPin className="h-10 w-10 text-muted-foreground/30" />
                </div>
              )}
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground truncate">{s.title}</h3>
                  {user?.id === s.userId && (
                    <button onClick={() => handleDelete(s.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {s.description && <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-primary/70">@{s.authorName}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(s.createdAt)}</span>
                </div>
                {s.fileName && <p className="text-xs text-muted-foreground truncate">📎 {s.fileName}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <Button size="sm" variant="neon" className="flex-1 h-8" onClick={() => handleDownload(s)}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Download ({s.downloads})
                  </Button>
                  <button
                    onClick={() => handleLike(s.id)}
                    className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded border transition-colors ${s.liked ? "text-red-500 border-red-500/30 bg-red-500/10" : "text-muted-foreground border-border hover:text-red-400"}`}
                  >
                    <Heart className={`h-3.5 w-3.5 ${s.liked ? "fill-current" : ""}`} /> {s.likes}
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

export default Schematics;
