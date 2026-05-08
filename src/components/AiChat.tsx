import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Bot, User, Sparkles, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type Msg = { role: "user" | "assistant"; content: string };

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied!", description: "Code copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-muted/80 hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
      title="Copy code"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
};

// Demo AI responses for Bloxd code questions
const getDemoResponse = (question: string): string => {
  const q = question.toLowerCase();
  
  if (q.includes("spawn") && q.includes("block")) {
    return `Here's a block spawner script for Bloxd:

\`\`\`javascript
// Block Spawner Script
function spawnBlock(type, x, y, z) {
  game.createBlock({
    position: { x, y, z },
    type: type || "stone"
  });
}

// Spawn blocks in a pattern
function spawnBlockGrid(size, blockType) {
  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      spawnBlock(blockType, x * 2, 10, z * 2);
    }
  }
}

// Usage: spawnBlockGrid(5, "cobblestone");
\`\`\`

This script creates blocks at specified positions. You can customize the block type and spawn patterns!`;
  }
  
  if (q.includes("jump") || q.includes("boost")) {
    return `Here's a jump boost power-up script:

\`\`\`javascript
// Jump Boost Power-up
function giveJumpBoost(player, multiplier = 2, duration = 10000) {
  const originalJump = player.jumpPower;
  player.jumpPower *= multiplier;
  
  player.sendMessage("Jump boost activated!");
  
  setTimeout(() => {
    player.jumpPower = originalJump;
    player.sendMessage("Jump boost expired!");
  }, duration);
}

// Double jump boost for 15 seconds
giveJumpBoost(currentPlayer, 2, 15000);
\`\`\`

You can adjust the multiplier and duration to balance the power-up!`;
  }
  
  if (q.includes("chat") || q.includes("command")) {
    return `Here's a custom chat commands system:

\`\`\`javascript
// Custom Chat Commands Handler
const commands = {
  help: (player) => {
    player.sendMessage("Available commands: /help, /tp, /give, /heal");
  },
  tp: (player, args) => {
    const [x, y, z] = args.map(Number);
    if (isNaN(x) || isNaN(y) || isNaN(z)) {
      player.sendMessage("Usage: /tp <x> <y> <z>");
      return;
    }
    player.teleport(x, y, z);
    player.sendMessage(\`Teleported to \${x}, \${y}, \${z}\`);
  },
  heal: (player) => {
    player.health = player.maxHealth;
    player.sendMessage("You have been healed!");
  }
};

game.on('chat', (message, player) => {
  if (!message.startsWith('/')) return;
  
  const [cmd, ...args] = message.slice(1).split(' ');
  const handler = commands[cmd.toLowerCase()];
  
  if (handler) {
    handler(player, args);
  } else {
    player.sendMessage("Unknown command. Type /help for a list.");
  }
});
\`\`\``;
  }
  
  if (q.includes("teleport") || q.includes("tp")) {
    return `Here's a teleportation script:

\`\`\`javascript
// Teleportation System
function teleportPlayer(player, destination) {
  // Save previous position for undo
  player.lastPosition = { ...player.position };
  
  player.teleport(destination.x, destination.y, destination.z);
  player.sendMessage(\`Teleported to \${destination.x}, \${destination.y}, \${destination.z}\`);
}

// Create teleport pads
function createTeleportPad(position, destination) {
  const pad = game.createBlock({
    position,
    type: "gold_block"
  });
  
  game.on('playerStep', (player, block) => {
    if (block.id === pad.id) {
      teleportPlayer(player, destination);
    }
  });
}

// Usage
createTeleportPad(
  { x: 0, y: 10, z: 0 },      // Pad location
  { x: 100, y: 50, z: 100 }   // Destination
);
\`\`\``;
  }
  
  // Default response
  return `I can help you write Bloxd code! Here are some things I can help with:

- **Block spawning** - Create blocks at positions
- **Player abilities** - Jump boosts, speed, health
- **Chat commands** - Custom /commands system
- **Teleportation** - Move players around the map
- **Game mechanics** - Scoring, timers, events

Try asking something like:
- "Create a block spawner script"
- "How do I add jump boost?"
- "Make a custom chat command system"

I'll generate working code examples for you!`;
};

const AiChat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || isLoading) return;
    
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to use the AI assistant", variant: "destructive" });
      return;
    }
    
    const userMsg: Msg = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Simulate AI thinking delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    
    const response = getDemoResponse(input.trim());
    
    // Simulate streaming by adding characters gradually
    let currentResponse = "";
    const chars = response.split("");
    
    for (let i = 0; i < chars.length; i += 5) {
      currentResponse += chars.slice(i, i + 5).join("");
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, idx) => idx === prev.length - 1 ? { ...m, content: currentResponse } : m);
        }
        return [...prev, { role: "assistant", content: currentResponse }];
      });
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-secondary/30">
        <Sparkles className="h-4 w-4 text-accent" />
        <span className="font-semibold text-sm text-foreground">Bloxd AI Coder</span>
        <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Demo Mode</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[280px]">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-6">
            <Bot className="h-8 w-8 mb-2 text-primary/40" />
            <p className="text-sm">Ask AI to write Bloxd code</p>
            <p className="text-xs mt-1 text-muted-foreground/60">Try: "Create a block spawner script"</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="shrink-0 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center mt-0.5">
                <Bot className="h-3.5 w-3.5 text-accent" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-primary/15 text-foreground border border-primary/20"
                  : "bg-secondary/40 text-foreground"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm prose-invert max-w-none [&_pre]:relative [&_pre]:bg-background [&_pre]:rounded [&_pre]:p-3 [&_pre]:pr-10 [&_pre]:text-xs [&_pre]:my-2 [&_code]:text-primary [&_code]:font-mono [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm">
                  <ReactMarkdown
                    components={{
                      code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "");
                        const codeString = String(children).replace(/\n$/, "");
                        if (match) {
                          return (
                            <div className="relative group not-prose my-2">
                              <SyntaxHighlighter
                                style={oneDark}
                                language={match[1]}
                                PreTag="div"
                                customStyle={{ margin: 0, borderRadius: "0.375rem", fontSize: "0.75rem" }}
                              >
                                {codeString}
                              </SyntaxHighlighter>
                              <CopyButton text={codeString} />
                            </div>
                          );
                        }
                        return (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      },
                      pre({ children }) {
                        return <>{children}</>;
                      },
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
            {msg.role === "user" && (
              <div className="shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-2">
            <div className="shrink-0 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
              <Bot className="h-3.5 w-3.5 text-accent animate-pulse-glow" />
            </div>
            <div className="bg-secondary/40 rounded-lg px-3 py-2 text-sm text-muted-foreground">
              Thinking...
            </div>
          </div>
        )}
      </div>

      <div className="p-2.5 border-t border-border">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Ask AI to code something..."
            className="flex-1 bg-secondary/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary/40 transition-colors"
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
