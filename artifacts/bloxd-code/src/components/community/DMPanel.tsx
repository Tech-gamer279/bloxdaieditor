import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, X } from "lucide-react";

interface DMMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface Props {
  conversationId: string;
  otherUserId: string;
  otherName: string;
  userId: string;
  onClose: () => void;
}

const DMPanel = ({ conversationId, otherName, userId, onClose }: Props) => {
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCountRef = useRef(0);

  const fetchMsgs = async () => {
    try {
      const data = await apiFetch(`/community/dm/conversation/${conversationId}/messages`);
      const msgs = (data || []) as DMMessage[];
      if (msgs.length !== lastCountRef.current) {
        lastCountRef.current = msgs.length;
        setMessages(msgs);
      }
    } catch {}
  };

  useEffect(() => {
    fetchMsgs();
    pollRef.current = setInterval(fetchMsgs, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    const content = text.trim();
    setText("");
    try {
      await apiFetch(`/community/dm/conversation/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ user_id: userId, content }),
      });
      await fetchMsgs();
    } catch {}
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 h-96 bg-card border border-border rounded-xl shadow-2xl flex flex-col z-50">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="font-semibold text-sm truncate">DM · {otherName}</span>
        <button onClick={onClose} className="p-1 hover:bg-secondary rounded"><X className="h-4 w-4" /></button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-2">
        {messages.length === 0 && <p className="text-xs text-center text-muted-foreground py-4">Start a conversation!</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.user_id === userId ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-3 py-1.5 rounded-2xl text-sm ${m.user_id === userId ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
              {m.content}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-2 border-t border-border flex gap-1">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message" className="h-8 text-sm" />
        <Button size="icon" variant="neon" type="submit" className="h-8 w-8"><Send className="h-3.5 w-3.5" /></Button>
      </form>
    </div>
  );
};

export default DMPanel;
