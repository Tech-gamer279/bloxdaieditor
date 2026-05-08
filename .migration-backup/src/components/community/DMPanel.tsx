import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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

  const fetchMsgs = async () => {
    const { data } = await supabase
      .from("dm_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at");
    setMessages((data || []) as DMMessage[]);
  };

  useEffect(() => {
    fetchMsgs();
    const ch = supabase
      .channel(`dm-${conversationId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${conversationId}` }, () => fetchMsgs())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    const content = text.trim();
    setText("");
    await supabase.from("dm_messages").insert({ conversation_id: conversationId, user_id: userId, content });
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 h-96 bg-card border border-border rounded-xl shadow-2xl flex flex-col z-50">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="font-semibold text-sm truncate">DM · {otherName}</span>
        <button onClick={onClose} className="p-1 hover:bg-secondary rounded"><X className="h-4 w-4" /></button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-2">
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
