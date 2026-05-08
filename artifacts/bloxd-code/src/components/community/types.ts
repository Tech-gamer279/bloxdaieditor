export interface Server {
  id: string;
  name: string;
  iconUrl: string | null;
  ownerId: string;
  inviteCode: string;
  isPublic?: boolean;
}

export interface PublicServer {
  id: string;
  name: string;
  iconUrl: string | null;
  inviteCode: string;
  createdAt: string;
}

export interface Channel {
  id: string;
  serverId: string;
  name: string;
  type: "text" | "voice";
  position: number;
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface Member {
  id: string;
  serverId: string;
  userId: string;
  role: "owner" | "admin" | "member";
  username?: string | null;
  avatarUrl?: string | null;
}

export interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
}

export interface VoiceParticipant {
  id: string;
  channelId: string;
  userId: string;
  username: string | null;
}
