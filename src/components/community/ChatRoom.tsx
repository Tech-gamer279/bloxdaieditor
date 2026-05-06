import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hash, Send, Smile, Trash2, Paperclip, Flag, Hammer, Download } from "lucide-react";
import type { Reaction } from "./types";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { bloxmodScan } from "./bots";

interface ChatMessage {
  id: string; channel_id: string; user_id: string; author_name: string;
  content: string; created_at: string;
  attachment_url?: string | null; attachment_type?: string | null; attachment_name?: string | null;
}

interface CustomEmoji { id: string; name: string; image_url: string; }
interface MemberRoleInfo { user_id: string; color: string; }

interface Props {
  channelId: string;
  channelName: string;
  serverId: string;
  userId: string;
  username: string;
  isAdmin: boolean;
  bloxmodEnabled: boolean;
  customEmojis: CustomEmoji[];
  memberColors: Map<string, string>;
}

const EMOJIS = ["👍", "❤️", "😂", "🔥", "🎉", "👀", "🚀", "💯"];

const ChatRoom = ({ channelId, channelName, serverId, userId, username, isAdmin, bloxmodEnabled, customEmojis, memberColors }: Props) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [text, setText] = useState("");
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [reportFor, setReportFor] = useState<ChatMessage | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [banFor, setBanFor] = useState<ChatMessage | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banDays, setBanDays] = useState<string>("0");
  const fileInput = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchAll = async () => {
    const { data: msgs } = await supabase.from("messages").select("*").eq("channel_id", channelId)
      .order("created_at", { ascending: true }).limit(200);
    setMessages((msgs || []) as ChatMessage[]);
    if (msgs && msgs.length) {
      const { data: rx } = await supabase.from("message_reactions").select("*").in("message_id", msgs.map((m) => m.id));
      setReactions((rx || []) as Reaction[]);
    } else setReactions([]);
  };

  useEffect(() => {
    fetchAll();
    const ch = supabase.channel(`chat-${channelId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [channelId]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const send = async (extra?: { url: string; type: string; name: string }) => {
    const content = text.trim();
    if (!content && !extra) return;
    if (bloxmodEnabled && content) {
      const blocked = bloxmodScan(content);
      if (blocked) return toast({ title: "🛡️ Bloxmod", description: blocked, variant: "destructive" });
    }
    setText("");
    const { error } = await supabase.from("messages").insert({
      channel_id: channelId, user_id: userId, author_name: username, content: content || "",
      attachment_url: extra?.url || null, attachment_type: extra?.type || null, attachment_name: extra?.name || null,
    });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
  };

  const handleFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) return toast({ title: "Too large", description: "Max 10MB", variant: "destructive" });
    const path = `${userId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("chat-attachments").upload(path, file);
    if (error) return toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    const { data: { publicUrl } } = supabase.storage.from("chat-attachments").getPublicUrl(path);
    await send({ url: publicUrl, type: file.type, name: file.name });
  };

  const react = async (messageId: string, emoji: string) => {
    setPickerFor(null);
    const existing = reactions.find((r) => r.message_id === messageId && r.user_id === userId && r.emoji === emoji);
    if (existing) await supabase.from("message_reactions").delete().eq("id", existing.id);
    else await supabase.from("message_reactions").insert({ message_id: messageId, user_id: userId, emoji });
  };

  const deleteMsg = async (id: string) => { await supabase.from("messages").delete().eq("id", id); };

  const submitReport = async () => {
    if (!reportFor || !reportReason.trim()) return;
    const { error } = await supabase.from("reports").insert({
      server_id: serverId, reporter_id: userId, target_type: "message",
      target_id: reportFor.id, target_user_id: reportFor.user_id, reason: reportReason.trim(),
    });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Reported", description: "Server admins will review." });
    setReportFor(null); setReportReason("");
  };

  const submitBan = async () => {
    if (!banFor) return;
    const days = parseInt(banDays) || 0;
    const { error } = await supabase.rpc("ban_member", {
      _server: serverId, _user: banFor.user_id, _reason: banReason || null, _days: days,
    });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "User banned", description: days > 0 ? `For ${days} days` : "Permanently" });
    setBanFor(null); setBanReason(""); setBanDays("0");
  };

  const groupedReactions = (msgId: string) => {
    const map = new Map<string, { count: number; mine: boolean }>();
    reactions.filter((r) => r.message_id === msgId).forEach((r) => {
      const cur = map.get(r.emoji) || { count: 0, mine: false };
      cur.count++;
      if (r.user_id === userId) cur.mine = true;
      map.set(r.emoji, cur);
    });
    return Array.from(map.entries());
  };

  // Render text with custom :emoji: replacement
  const renderContent = (content: string) => {
    if (!customEmojis.length) return content;
    const parts = content.split(/(:[a-zA-Z0-9_]+:)/g);
    return parts.map((p, i) => {
      const m = p.match(/^:([a-zA-Z0-9_]+):$/);
      if (m) {
        const e = customEmojis.find((x) => x.name === m[1]);
        if (e) return <img key={i} src={e.image_url} alt={p} className="inline-block h-5 w-5 align-text-bottom mx-0.5" />;
      }
      return <span key={i}>{p}</span>;
    });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Hash className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold">{channelName}</span>
        {bloxmodEnabled && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">🛡️ Bloxmod</span>}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && <div className="text-center text-muted-foreground text-sm py-8">No messages yet — say hi!</div>}
        {messages.map((m) => {
          const own = m.user_id === userId;
          const color = memberColors.get(m.user_id);
          const isImg = m.attachment_type?.startsWith("image/");
          return (
            <div key={m.id} className="group flex gap-3 hover:bg-secondary/20 -mx-2 px-2 py-1 rounded">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold shrink-0">
                {m.author_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-sm" style={color ? { color } : undefined}>{m.author_name}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                {m.content && <div className="text-sm text-foreground/90 whitespace-pre-wrap break-words">{renderContent(m.content)}</div>}
                {m.attachment_url && (
                  isImg ? (
                    <a href={m.attachment_url} target="_blank" rel="noopener noreferrer">
                      <img src={m.attachment_url} alt={m.attachment_name || ""} className="mt-2 max-w-xs max-h-64 rounded border border-border" />
                    </a>
                  ) : (
                    <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 text-xs px-3 py-2 bg-secondary rounded border border-border hover:bg-secondary/70">
                      <Download className="h-3 w-3" /> {m.attachment_name}
                    </a>
                  )
                )}
                <div className="flex flex-wrap gap-1 mt-1">
                  {groupedReactions(m.id).map(([emoji, { count, mine }]) => {
                    const ce = emoji.startsWith(":") ? customEmojis.find((x) => `:${x.name}:` === emoji) : null;
                    return (
                      <button key={emoji} onClick={() => react(m.id, emoji)}
                        className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${mine ? "bg-primary/20 border-primary/40" : "bg-secondary/50 border-border"}`}>
                        {ce ? <img src={ce.image_url} className="h-4 w-4" /> : emoji} {count}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 flex items-start gap-1 relative">
                <button onClick={() => setPickerFor(pickerFor === m.id ? null : m.id)} className="p-1 hover:bg-secondary rounded"><Smile className="h-3.5 w-3.5" /></button>
                {!own && <button onClick={() => setReportFor(m)} className="p-1 hover:bg-secondary rounded text-yellow-500" title="Report"><Flag className="h-3.5 w-3.5" /></button>}
                {isAdmin && !own && <button onClick={() => setBanFor(m)} className="p-1 hover:bg-destructive/20 rounded text-destructive" title="Ban"><Hammer className="h-3.5 w-3.5" /></button>}
                {(own || isAdmin) && <button onClick={() => deleteMsg(m.id)} className="p-1 hover:bg-destructive/20 rounded text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>}
                {pickerFor === m.id && (
                  <div className="absolute right-0 top-7 bg-popover border border-border rounded-lg p-1 flex flex-wrap gap-1 z-10 shadow-lg max-w-[200px]">
                    {EMOJIS.map((e) => <button key={e} onClick={() => react(m.id, e)} className="hover:bg-secondary rounded p-1 text-base">{e}</button>)}
                    {customEmojis.map((ce) => (
                      <button key={ce.id} onClick={() => react(m.id, `:${ce.name}:`)} className="hover:bg-secondary rounded p-1">
                        <img src={ce.image_url} className="h-5 w-5" alt={ce.name} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-3 border-t border-border">
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
          <input ref={fileInput} type="file" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <Button type="button" size="icon" variant="ghost" onClick={() => fileInput.current?.click()} title="Attach file"><Paperclip className="h-4 w-4" /></Button>
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message #${channelName}  (use :name: for custom emojis)`} className="flex-1" />
          <Button type="submit" variant="neon" size="icon"><Send className="h-4 w-4" /></Button>
        </form>
      </div>

      <Dialog open={!!reportFor} onOpenChange={(o) => !o && setReportFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Report message</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">"{reportFor?.content?.slice(0, 100)}"</p>
          <Textarea placeholder="Why are you reporting this?" value={reportReason} onChange={(e) => setReportReason(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReportFor(null)}>Cancel</Button>
            <Button variant="neon" onClick={submitReport}>Submit report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!banFor} onOpenChange={(o) => !o && setBanFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ban {banFor?.author_name}</DialogTitle></DialogHeader>
          <Input placeholder="Reason (optional)" value={banReason} onChange={(e) => setBanReason(e.target.value)} />
          <div>
            <label className="text-xs text-muted-foreground">Duration (days, 0 = permanent)</label>
            <Input type="number" min={0} value={banDays} onChange={(e) => setBanDays(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBanFor(null)}>Cancel</Button>
            <Button variant="destructive" onClick={submitBan}>Ban</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatRoom;
