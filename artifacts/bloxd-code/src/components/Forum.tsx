import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useApi, apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, ArrowLeft, Send, Plus, Clock, User } from "lucide-react";

type ForumPost = { id: string; userId: string; authorName: string; title: string; content: string; replyCount: number; createdAt: string };
type ForumReply = { id: string; postId: string; userId: string; authorName: string; content: string; createdAt: string };

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const Forum = () => {
  const { user } = useAuth();
  const api = useApi();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const data = await apiFetch("/forum/posts");
      setPosts(data as ForumPost[]);
    } catch {}
  }, []);

  const fetchReplies = useCallback(async (postId: string) => {
    setLoadingReplies(true);
    try {
      const data = await apiFetch(`/forum/posts/${postId}/replies`);
      setReplies(data as ForumReply[]);
    } catch {}
    setLoadingReplies(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  useEffect(() => {
    if (!selectedPost) return;
    fetchReplies(selectedPost.id);
  }, [selectedPost, fetchReplies]);

  const handleCreatePost = async () => {
    if (!user) { toast({ title: "Sign in required", variant: "destructive" }); return; }
    const title = newTitle.trim();
    const content = newContent.trim();
    if (!title || !content) { toast({ title: "Missing fields", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const post = await api("/forum/posts", { method: "POST", body: JSON.stringify({ title, content }) }) as ForumPost;
      setPosts((prev) => [post, ...prev]);
      setNewTitle(""); setNewContent(""); setShowNew(false);
      toast({ title: "Post created!" });
    } catch (e: unknown) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  const handleReply = async () => {
    if (!user || !selectedPost) { toast({ title: "Sign in required", variant: "destructive" }); return; }
    const content = replyContent.trim();
    if (!content) return;
    setSubmitting(true);
    try {
      const reply = await api(`/forum/posts/${selectedPost.id}/replies`, { method: "POST", body: JSON.stringify({ content }) }) as ForumReply;
      setReplies((prev) => [...prev, reply]);
      setSelectedPost((p) => p ? { ...p, replyCount: p.replyCount + 1 } : p);
      setReplyContent("");
      toast({ title: "Reply posted!" });
    } catch (e: unknown) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  if (selectedPost) {
    return (
      <div className="space-y-4">
        <button onClick={() => { setSelectedPost(null); setReplies([]); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to forum
        </button>
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-lg font-bold text-foreground">{selectedPost.title}</h2>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="text-primary/70">@{selectedPost.authorName}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(selectedPost.createdAt)}</span>
          </div>
          <p className="mt-3 text-sm text-foreground/80 whitespace-pre-wrap">{selectedPost.content}</p>
        </div>
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Replies ({selectedPost.replyCount})
          </h3>
          {loadingReplies ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading replies...</p>
          ) : replies.map((r) => (
            <div key={r.id} className="rounded-md border border-border bg-card/50 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <User className="h-3 w-3" />
                <span className="text-primary/70">@{r.authorName}</span>
                <span>{timeAgo(r.createdAt)}</span>
              </div>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">{r.content}</p>
            </div>
          ))}
        </div>
        {user && (
          <div className="flex gap-2">
            <Textarea value={replyContent} onChange={(e) => setReplyContent(e.target.value)} placeholder="Write a reply..." className="text-sm min-h-[60px] resize-none bg-secondary/30 border-border" maxLength={2000} />
            <Button variant="neon" size="icon" className="shrink-0 self-end" onClick={handleReply} disabled={submitting || !replyContent.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
        {!user && <p className="text-sm text-muted-foreground text-center py-2">Sign in to reply</p>}
      </div>
    );
  }

  if (showNew) {
    return (
      <div className="space-y-4">
        <button onClick={() => setShowNew(false)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to forum
        </button>
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">New Post</h2>
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Post title" maxLength={200} className="bg-secondary/30 border-border" />
          <Textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="What's on your mind?" className="text-sm min-h-[120px] resize-none bg-secondary/30 border-border" maxLength={5000} />
          <Button variant="neon" onClick={handleCreatePost} disabled={submitting}>
            {submitting ? "Posting..." : "Create Post"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Forum</h2>
        <Button variant="neon" size="sm" onClick={() => {
          if (!user) { toast({ title: "Sign in required", variant: "destructive" }); return; }
          setShowNew(true);
        }}>
          <Plus className="h-4 w-4" /> New Post
        </Button>
      </div>
      {posts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No forum posts yet</p>
          <p className="text-xs mt-1">Start a discussion!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <div key={post.id} onClick={() => setSelectedPost(post)} className="cursor-pointer rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:glow-cyan">
              <h3 className="font-semibold text-foreground hover:text-primary transition-colors truncate">{post.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.content}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="text-primary/70">@{post.authorName}</span>
                <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{post.replyCount}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(post.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Forum;
