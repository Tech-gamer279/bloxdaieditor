import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hash, Send, Smile, Trash2, Paperclip, Flag, Plus } from "lucide-react";
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

const ChatRoom = ({ channelId, channelName, userId, username, isAdmin }: Props) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [text, setText] = useState("");
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchAll = async () => {
    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages((msgs || []) as Message[]);
    if (msgs && msgs.length) {
      const { data: rx } = await supabase
        .from("message_reactions")
        .select("*")
        .in("message_id", msgs.map((m) => m.id));
      setReactions((rx || []) as Reaction[]);
    } else {
      setReactions([]);
    }
  };

  useEffect(() => {
    fetchAll();
    const ch = supabase
      .channel(`chat-${channelId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [channelId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    const content = text.trim();
    setText("");
    const { error } = await supabase.from("messages").insert({
      channel_id: channelId, user_id: userId, author_name: username, content,
    });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
  };

  const uploadFile = async (file: File) => {
    if (!file) return;
    setUploading(true);
    const filePath = `attachments/chat/${channelId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("attachments").upload(filePath, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData, error: urlError } = supabase.storage.from("attachments").getPublicUrl(filePath);
    if (urlError || !urlData.publicUrl) {
      toast({ title: "Upload failed", description: urlError?.message || "Could not create file URL", variant: "destructive" });
      setUploading(false);
      return;
    }

    const content = `📎 ${file.name} ${urlData.publicUrl}`;
    const { error } = await supabase.from("messages").insert({
      channel_id: channelId, user_id: userId, author_name: username, content,
    });
    if (error) {
      toast({ title: "Failed to send file", description: error.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    event.target.value = "";
  };

  const addCustomReaction = async (messageId: string) => {
    const emoji = window.prompt("Enter a custom emoji or reaction text");
    if (!emoji?.trim()) return;
    await react(messageId, emoji.trim());
  };

  const reportMessage = async (messageId: string) => {
    const reason = window.prompt("Why are you reporting this message?");
    if (!reason?.trim()) return;
    const { error } = await supabase.rpc("report_message", { _message_id: messageId, _reason: reason.trim() });
    if (error) {
      toast({ title: "Report failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Reported", description: "Thanks! The team has been notified." });
  };

  const react = async (messageId: string, emoji: string) => {
    setPickerFor(null);
    const existing = reactions.find((r) => r.message_id === messageId && r.user_id === userId && r.emoji === emoji);
    if (existing) {
      await supabase.from("message_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("message_reactions").insert({ message_id: messageId, user_id: userId, emoji });
    }
  };

  const deleteMsg = async (id: string) => {
    await supabase.from("messages").delete().eq("id", id);
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

  const renderMessageContent = (content: string) => {
    return content.split(/(https?:\/\/[^\s]+)/g).map((segment, index) => {
      if (/^https?:\/\//.test(segment)) {
        return (
          <a key={index} href={segment} target="_blank" rel="noreferrer" className="underline text-primary">
            {segment}
          </a>
        );
      }
      return <span key={index}>{segment}</span>;
    });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Hash className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold">{channelName}</span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">No messages yet — say hi!</div>
        )}
        {messages.map((m) => {
          const own = m.user_id === userId;
          return (
            <div key={m.id} className="group flex gap-3 hover:bg-secondary/20 -mx-2 px-2 py-1 rounded">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold shrink-0">
                {m.author_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-sm">{m.author_name}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className="text-sm text-foreground/90 whitespace-pre-wrap break-words">{renderMessageContent(m.content)}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {groupedReactions(m.id).map(([emoji, { count, mine }]) => (
                    <button
                      key={emoji}
                      onClick={() => react(m.id, emoji)}
                      className={`text-xs px-2 py-0.5 rounded-full border ${mine ? "bg-primary/20 border-primary/40" : "bg-secondary/50 border-border"}`}
                    >
                      {emoji} {count}
                    </button>
                  ))}
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 flex items-start gap-1 relative">
                <button onClick={() => setPickerFor(pickerFor === m.id ? null : m.id)} className="p-1 hover:bg-secondary rounded">
                  <Smile className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => addCustomReaction(m.id)} className="p-1 hover:bg-secondary rounded">
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => reportMessage(m.id)} className="p-1 hover:bg-secondary rounded text-amber-500">
                  <Flag className="h-3.5 w-3.5" />
                </button>
                {(own || isAdmin) && (
                  <button onClick={() => deleteMsg(m.id)} className="p-1 hover:bg-destructive/20 rounded text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                {pickerFor === m.id && (
                  <div className="absolute right-0 top-7 bg-popover border border-border rounded-lg p-1 flex gap-1 z-10 shadow-lg">
                    {EMOJIS.map((e) => (
                      <button key={e} onClick={() => react(m.id, e)} className="hover:bg-secondary rounded p-1 text-base">{e}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-3 border-t border-border">
        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="flex gap-2 items-center"
        >
          <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChange} />
          <Button type="button" variant="ghost" size="icon" className="h-10 w-10" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Message #${channelName}`}
            className="flex-1"
          />
          <Button type="submit" variant="neon" size="icon" disabled={uploading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatRoom;
