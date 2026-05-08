export interface Server {
  id: string;
  name: string;
  icon_url: string | null;
  owner_id: string;
  invite_code: string;
  is_public?: boolean;
}

export interface PublicServer {
  id: string;
  name: string;
  icon_url: string | null;
  invite_code: string;
  member_count: number;
  created_at: string;
}

export interface Channel {
  id: string;
  server_id: string;
  name: string;
  type: "text" | "voice";
  position: number;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

export interface Member {
  id: string;
  server_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  username?: string | null;
  avatar_url?: string | null;
}

export interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

export interface VoiceParticipant {
  id: string;
  channel_id: string;
  user_id: string;
  username: string | null;
}
