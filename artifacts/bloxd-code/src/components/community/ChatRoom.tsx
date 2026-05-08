import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hash, Send, Smile, Trash2, Flag, Plus } from "lucide-react";
import type { Message, Reaction } from "./types";
import { toast } from "@/hooks/use-toast";

interface Props {
  channelId: string;
  channelName: string;
  userId: string;
  username: string;
  isAdmin: boolean;
}

const EMOJIS = ["👍", "❤️", "😂", "🔥", "🎉", "👀"];
const PAGE_SIZE = 50;

const ChatRoom = ({ channelId, channelName, userId, username, isAdmin }: Props) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [text, setText] = useState("");
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const initialLoadRef = useRef(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMsgCountRef = useRef(0);

  const loadReactionsFor = async (ids: string[]): Promise<Reaction[]> => {
    if (!ids.length) return [];
    try {
      const data = await apiFetch(`/community/messages/reactions?ids=${ids.join(",")}`);
      return (data || []) as Reaction[];
    } catch {
      return [];
    }
  };

  const loadInitial = async () => {
    try {
      const data = await apiFetch(`/community/channels/${channelId}/messages?limit=${PAGE_SIZE}`);
      const msgs = (data || []) as Message[];
      setMessages(msgs);
      setHasMore(msgs.length === PAGE_SIZE);
      setReactions(await loadReactionsFor(msgs.map((m) => m.id)));
      lastMsgCountRef.current = msgs.length;
      initialLoadRef.current = true;
    } catch {}
  };

  const pollMessages = async () => {
    try {
      const data = await apiFetch(`/community/channels/${channelId}/messages?limit=${PAGE_SIZE}`);
      const msgs = (data || []) as Message[];
      if (msgs.length !== lastMsgCountRef.current) {
        lastMsgCountRef.current = msgs.length;
        setMessages(msgs);
        setReactions(await loadReactionsFor(msgs.map((m) => m.id)));
      }
    } catch {}
  };

  const loadOlder = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    const oldest = messages[0];
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const prevTop = el?.scrollTop ?? 0;
    try {
      const data = await apiFetch(`/community/channels/${channelId}/messages?limit=${PAGE_SIZE}&before=${oldest.id}`);
      const older = (data || []) as Message[];
      if (older.length) {
        setMessages((prev) => [...older, ...prev]);
        const newRx = await loadReactionsFor(older.map((m) => m.id));
        setReactions((prev) => [...prev, ...newRx]);
        requestAnimationFrame(() => {
          if (el) el.scrollTop = prevTop + (el.scrollHeight - prevHeight);
        });
      }
      if (older.length < PAGE_SIZE) setHasMore(false);
    } catch {}
    setLoadingMore(false);
  };

  useEffect(() => {
    loadInitial();
    pollRef.current = setInterval(pollMessages, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (el.scrollTop < 60 && hasMore && !loadingMore) loadOlder();
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (initialLoadRef.current) {
      el.scrollTop = el.scrollHeight;
      initialLoadRef.current = false;
      return;
    }
    if (isAtBottomRef.current) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    const content = text.trim();
    setText("");
    try {
      await apiFetch(`/community/channels/${channelId}/messages`, {
        method: "POST",
        body: JSON.stringify({ user_id: userId, author_name: username, content }),
      });
      await pollMessages();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const reportMessage = async (messageId: string) => {
    const reason = window.prompt("Why are you reporting this message?");
    if (!reason?.trim()) return;
    const msg = messages.find((m) => m.id === messageId);
    try {
      await apiFetch("/community/reports", {
        method: "POST",
        body: JSON.stringify({ reporter_id: userId, target_type: "message", target_id: messageId, target_user_id: msg?.user_id ?? null, reason: reason.trim() }),
      });
      toast({ title: "Reported", description: "Thanks! The team has been notified." });
    } catch (e: any) {
      toast({ title: "Report failed", description: e.message, variant: "destructive" });
    }
  };

  const react = async (messageId: string, emoji: string) => {
    setPickerFor(null);
    try {
      await apiFetch(`/community/messages/${messageId}/reactions`, {
        method: "POST",
        body: JSON.stringify({ user_id: userId, emoji }),
      });
      await pollMessages();
    } catch {}
  };

  const addCustomReaction = async (messageId: string) => {
    const emoji = window.prompt("Enter a custom emoji or reaction text");
    if (!emoji?.trim()) return;
    await react(messageId, emoji.trim());
  };

  const deleteMsg = async (id: string) => {
    try {
      await apiFetch(`/community/messages/${id}`, { method: "DELETE" });
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch {}
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

  const renderContent = (content: string) =>
    content.split(/(https?:\/\/[^\s]+)/g).map((seg, i) =>
      /^https?:\/\//.test(seg)
        ? <a key={i} href={seg} target="_blank" rel="noreferrer" className="underline text-primary">{seg}</a>
        : <span key={i}>{seg}</span>
    );

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Hash className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold">{channelName}</span>
      </div>
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto p-4 space-y-3">
        {loadingMore && <div className="text-center text-xs text-muted-foreground py-2">Loading older messages…</div>}
        {messages.length === 0 && <div className="text-center text-muted-foreground text-sm py-8">No messages yet — say hi!</div>}
        {messages.map((m) => (
          <div key={m.id} className="group flex gap-3 hover:bg-secondary/20 -mx-2 px-2 py-1 rounded">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold shrink-0">
              {m.author_name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-sm">{m.author_name}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div className="text-sm text-foreground/90 whitespace-pre-wrap break-words">{renderContent(m.content)}</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {groupedReactions(m.id).map(([emoji, { count, mine }]) => (
                  <button key={emoji} onClick={() => react(m.id, emoji)} className={`text-xs px-2 py-0.5 rounded-full border ${mine ? "bg-primary/20 border-primary/40" : "bg-secondary/50 border-border"}`}>
                    {emoji} {count}
                  </button>
                ))}
              </div>
            </div>
            <div className="opacity-0 group-hover:opacity-100 flex items-start gap-1 relative">
              <button onClick={() => setPickerFor(pickerFor === m.id ? null : m.id)} className="p-1 hover:bg-secondary rounded"><Smile className="h-3.5 w-3.5" /></button>
              <button onClick={() => addCustomReaction(m.id)} className="p-1 hover:bg-secondary rounded"><Plus className="h-3.5 w-3.5" /></button>
              <button onClick={() => reportMessage(m.id)} className="p-1 hover:bg-secondary rounded text-amber-500"><Flag className="h-3.5 w-3.5" /></button>
              {(m.user_id === userId || isAdmin) && (
                <button onClick={() => deleteMsg(m.id)} className="p-1 hover:bg-destructive/20 rounded text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              )}
              {pickerFor === m.id && (
                <div className="absolute right-0 top-7 bg-popover border border-border rounded-lg p-1 flex gap-1 z-10 shadow-lg">
                  {EMOJIS.map((e) => <button key={e} onClick={() => react(m.id, e)} className="hover:bg-secondary rounded p-1 text-base">{e}</button>)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-border">
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 items-center">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message #${channelName}`} className="flex-1" />
          <Button type="submit" variant="neon" size="icon"><Send className="h-4 w-4" /></Button>
        </form>
      </div>
    </div>
  );
};

export default ChatRoom;
