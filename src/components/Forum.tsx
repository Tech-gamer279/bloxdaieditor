import { useState, useEffect } from "react";
import { forumApi, profilesApi, subscribe, notifyChange } from "@/lib/demo-data";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, ArrowLeft, Send, Plus, Clock, User } from "lucide-react";

type ForumPost = {
  id: string;
  user_id: string;
  author_name: string;
  title: string;
  content: string;
  reply_count: number;
  created_at: string;
};

type ForumReply = {
  id: string;
  post_id: string;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
};

// Store replies in localStorage
const REPLIES_KEY = 'bloxd_demo_forum_replies';

const getReplies = (postId: string): ForumReply[] => {
  try {
    const stored = localStorage.getItem(REPLIES_KEY);
    const all = stored ? JSON.parse(stored) : [];
    return all.filter((r: ForumReply) => r.post_id === postId);
  } catch {
    return [];
  }
};

const addReply = (reply: ForumReply) => {
  try {
    const stored = localStorage.getItem(REPLIES_KEY);
    const all = stored ? JSON.parse(stored) : [];
    all.push(reply);
    localStorage.setItem(REPLIES_KEY, JSON.stringify(all));
  } catch {}
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

const Forum = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPosts = () => {
    const data = forumApi.getAll();
    setPosts(data);
  };

  const fetchReplies = (postId: string) => {
    const data = getReplies(postId);
    setReplies(data);
  };

  useEffect(() => {
    fetchPosts();
    const unsubscribe = subscribe(fetchPosts);
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!selectedPost) return;
    fetchReplies(selectedPost.id);
  }, [selectedPost]);

  const handleCreatePost = () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Sign in to create forum posts", variant: "destructive" });
      return;
    }
    const title = newTitle.trim();
    const content = newContent.trim();
    if (!title || !content) {
      toast({ title: "Missing fields", description: "Title and content are required", variant: "destructive" });
      return;
    }
    if (title.length > 200 || content.length > 5000) {
      toast({ title: "Too long", description: "Title max 200 chars, content max 5000 chars", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    
    const profile = profilesApi.get(user.id);
    forumApi.create({
      title,
      content,
      user_id: user.id,
      author_name: profile?.username || user.username || "anonymous",
    });
    
    setNewTitle("");
    setNewContent("");
    setShowNew(false);
    setSubmitting(false);
    notifyChange();
    toast({ title: "Post created!", description: "Your post is now visible in the forum" });
  };

  const handleReply = () => {
    if (!user || !selectedPost) {
      toast({ title: "Sign in required", description: "Sign in to reply", variant: "destructive" });
      return;
    }
    const content = replyContent.trim();
    if (!content) return;
    if (content.length > 2000) {
      toast({ title: "Too long", description: "Reply max 2000 chars", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    
    const profile = profilesApi.get(user.id);
    const newReply: ForumReply = {
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      post_id: selectedPost.id,
      content,
      user_id: user.id,
      author_name: profile?.username || user.username || "anonymous",
      created_at: new Date().toISOString(),
    };
    
    addReply(newReply);
    setReplies(prev => [...prev, newReply]);
    setReplyContent("");
    setSubmitting(false);
    toast({ title: "Reply posted!" });
  };

  // Post detail view
  if (selectedPost) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => { setSelectedPost(null); setReplies([]); }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to forum
        </button>

        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-lg font-bold text-foreground">{selectedPost.title}</h2>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="text-primary/70">@{selectedPost.author_name}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(selectedPost.created_at)}</span>
          </div>
          <p className="mt-3 text-sm text-foreground/80 whitespace-pre-wrap">{selectedPost.content}</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Replies ({replies.length})
          </h3>
          {replies.map((r) => (
            <div key={r.id} className="rounded-md border border-border bg-card/50 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <User className="h-3 w-3" />
                <span className="text-primary/70">@{r.author_name}</span>
                <span>{timeAgo(r.created_at)}</span>
              </div>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">{r.content}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder={user ? "Write a reply..." : "Sign in to reply"}
            className="text-sm min-h-[60px] resize-none bg-secondary/30 border-border"
            maxLength={2000}
            disabled={!user}
          />
          <Button
            variant="neon"
            size="icon"
            className="shrink-0 self-end"
            onClick={handleReply}
            disabled={submitting || !replyContent.trim() || !user}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // New post form
  if (showNew) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setShowNew(false)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to forum
        </button>
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">New Post</h2>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Post title"
            maxLength={200}
            className="bg-secondary/30 border-border"
          />
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="What's on your mind?"
            className="text-sm min-h-[120px] resize-none bg-secondary/30 border-border"
            maxLength={5000}
          />
          <Button variant="neon" onClick={handleCreatePost} disabled={submitting}>
            {submitting ? "Posting..." : "Create Post"}
          </Button>
        </div>
      </div>
    );
  }

  // Post list
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Forum
        </h2>
        <Button variant="neon" size="sm" onClick={() => {
          if (!user) {
            toast({ title: "Sign in required", description: "Sign in to create posts", variant: "destructive" });
            return;
          }
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
            <div
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className="cursor-pointer rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:glow-cyan"
            >
              <h3 className="font-semibold text-foreground hover:text-primary transition-colors truncate">
                {post.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.content}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="text-primary/70">@{post.author_name}</span>
                <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{post.reply_count}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(post.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Forum;
