import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Bot, User, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

const AiChat = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bloxd-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: allMessages }),
        }
      );

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) throw new Error("Rate limited. Please wait a moment.");
        if (resp.status === 402) throw new Error("AI credits exhausted. Please add funds.");
        throw new Error("AI request failed");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantSoFar = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {}
        }
      }
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${e.message}` }]);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/30">
        <Sparkles className="h-4 w-4 text-accent" />
        <span className="font-semibold text-sm text-foreground">Bloxd AI Coder</span>
        <span className="text-xs text-muted-foreground">— Ask me to write Bloxd code</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-8">
            <Bot className="h-10 w-10 mb-3 text-primary/40" />
            <p className="text-sm">Ask the AI to help you write Bloxd code!</p>
            <p className="text-xs mt-1">Try: "Create a block spawner script"</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="shrink-0 w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center">
                <Bot className="h-4 w-4 text-accent" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-primary/15 text-foreground border border-primary/20"
                  : "bg-secondary/50 text-foreground"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm prose-invert max-w-none [&_pre]:bg-background [&_pre]:rounded [&_pre]:p-3 [&_pre]:text-xs [&_code]:text-primary [&_code]:font-mono">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
            {msg.role === "user" && (
              <div className="shrink-0 w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
            )}
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-3">
            <div className="shrink-0 w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center">
              <Bot className="h-4 w-4 text-accent animate-pulse-glow" />
            </div>
            <div className="bg-secondary/50 rounded-lg px-4 py-2.5 text-sm text-muted-foreground">
              Thinking...
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Ask AI to code something..."
            className="flex-1 bg-secondary/50 rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary/40 transition-colors"
          />
          <Button variant="neon" size="icon" onClick={send} disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AiChat;
