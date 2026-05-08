import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Users, Hash, Send, Plus, Settings } from "lucide-react";

// Demo community data stored in localStorage
const COMMUNITY_KEY = 'bloxd_demo_community';

interface Message {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
}

interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
}

const defaultChannels: Channel[] = [
  { id: 'general', name: 'general', type: 'text' },
  { id: 'help', name: 'help', type: 'text' },
  { id: 'showcase', name: 'showcase', type: 'text' },
];

const getMessages = (): Message[] => {
  try {
    const stored = localStorage.getItem(`${COMMUNITY_KEY}_messages`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveMessages = (messages: Message[]) => {
  localStorage.setItem(`${COMMUNITY_KEY}_messages`, JSON.stringify(messages));
};

const Community = () => {
  const { user } = useAuth();
  const [activeChannel, setActiveChannel] = useState<Channel>(defaultChannels[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    setMessages(getMessages());
  }, []);

  const channelMessages = messages.filter(m => m.channelId === activeChannel.id);

  const sendMessage = () => {
    if (!newMessage.trim() || !user) return;
    
    const message: Message = {
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      channelId: activeChannel.id,
      userId: user.id,
      username: user.username || 'anonymous',
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };
    
    const updated = [...messages, message];
    setMessages(updated);
    saveMessages(updated);
    setNewMessage('');
  };

  if (!user) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">Sign in to join the community</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] border border-border rounded-lg overflow-hidden bg-card/20">
      {/* Channels sidebar */}
      <div className="w-56 border-r border-border bg-card/30 flex flex-col">
        <div className="p-3 border-b border-border">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Bloxd Community
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Demo Mode</p>
        </div>
        
        <div className="p-2 flex-1 overflow-y-auto">
          <p className="text-xs text-muted-foreground uppercase tracking-wider px-2 py-1">Text Channels</p>
          {defaultChannels.map(channel => (
            <button
              key={channel.id}
              onClick={() => setActiveChannel(channel)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                activeChannel.id === channel.id
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <Hash className="h-4 w-4" />
              {channel.name}
            </button>
          ))}
        </div>
        
        <div className="p-2 border-t border-border">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-secondary/30">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
              {(user.username || 'A').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user.username}</p>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        <div className="p-3 border-b border-border flex items-center gap-2">
          <Hash className="h-5 w-5 text-muted-foreground" />
          <span className="font-semibold text-foreground">{activeChannel.name}</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {channelMessages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Hash className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No messages in #{activeChannel.name} yet</p>
              <p className="text-xs mt-1">Be the first to say something!</p>
            </div>
          ) : (
            channelMessages.map(msg => (
              <div key={msg.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                  {msg.username.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">{msg.username}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90">{msg.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="p-3 border-t border-border">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder={`Message #${activeChannel.name}`}
              className="bg-secondary/30"
            />
            <Button variant="neon" size="icon" onClick={sendMessage} disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Members sidebar */}
      <div className="w-48 border-l border-border bg-card/30 p-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Online - 1</p>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary/30">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
              {(user.username || 'A').slice(0, 2).toUpperCase()}
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card" />
          </div>
          <span className="text-sm text-foreground truncate">{user.username}</span>
        </div>
      </div>
    </div>
  );
};

export default Community;
