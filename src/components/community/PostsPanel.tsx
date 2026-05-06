import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pin, Trash2, Plus, Megaphone } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Post {
  id: string; user_id: string; author_name: string; title: string;
  content: string; pinned: boolean; created_at: string;
}

interface Props {
  serverId: string;
  userId: string;
  username: string;
  isAdmin: boolean;
}

const PostsPanel = ({ serverId, userId, username, isAdmin }: Props) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const load = async () => {
    const { data } = await supabase.from("server_posts").select("*").eq("server_id", serverId)
      .order("pinned", { ascending: false }).order("created_at", { ascending: false });
    setPosts((data || []) as Post[]);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel(`posts-${serverId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "server_posts", filter: `server_id=eq.${serverId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [serverId]);

  const create = async () => {
    if (!title.trim() || !content.trim()) return;
    const { error } = await supabase.from("server_posts").insert({
      server_id: serverId, user_id: userId, author_name: username, title: title.trim(), content: content.trim(),
    });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setTitle(""); setContent(""); setOpen(false);
  };
  const togglePin = async (p: Post) => {
    await supabase.from("server_posts").update({ pinned: !p.pinned }).eq("id", p.id);
  };
  const del = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    await supabase.from("server_posts").delete().eq("id", id);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">Posts</span>
        </div>
        <Button size="sm" variant="neon" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New post</Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {posts.length === 0 && <div className="text-center text-muted-foreground text-sm py-8">No posts yet.</div>}
        {posts.map((p) => (
          <div key={p.id} className={`border rounded-lg p-4 ${p.pinned ? "border-primary/40 bg-primary/5" : "border-border bg-card/30"}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  {p.pinned && <Pin className="h-3 w-3 text-primary" />}
                  <h3 className="font-semibold">{p.title}</h3>
                </div>
                <div className="text-xs text-muted-foreground">{p.author_name} • {new Date(p.created_at).toLocaleString()}</div>
              </div>
              <div className="flex gap-1">
                {isAdmin && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => togglePin(p)}><Pin className="h-3.5 w-3.5" /></Button>}
                {(p.user_id === userId || isAdmin) && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
              </div>
            </div>
            <p className="text-sm mt-2 whitespace-pre-wrap">{p.content}</p>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New post</DialogTitle></DialogHeader>
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="What's on your mind?" rows={5} value={content} onChange={(e) => setContent(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="neon" onClick={create}>Post</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PostsPanel;
