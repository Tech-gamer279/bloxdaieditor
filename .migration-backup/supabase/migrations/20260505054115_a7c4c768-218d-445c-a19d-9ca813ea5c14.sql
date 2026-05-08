-- Enums
CREATE TYPE public.server_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE public.channel_type AS ENUM ('text', 'voice');

-- Servers
CREATE TABLE public.servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon_url text,
  owner_id uuid NOT NULL,
  invite_code text NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Members
CREATE TABLE public.server_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.server_role NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(server_id, user_id)
);
CREATE INDEX idx_server_members_user ON public.server_members(user_id);
CREATE INDEX idx_server_members_server ON public.server_members(server_id);

-- Channels
CREATE TABLE public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  name text NOT NULL,
  type public.channel_type NOT NULL DEFAULT 'text',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_channels_server ON public.channels(server_id);

-- Messages
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  author_name text NOT NULL DEFAULT 'anonymous',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_channel ON public.messages(channel_id, created_at DESC);

-- Reactions
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);
CREATE INDEX idx_reactions_message ON public.message_reactions(message_id);

-- DM conversations (user_a < user_b enforced by trigger)
CREATE TABLE public.dm_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_a, user_b),
  CHECK (user_a <> user_b)
);
CREATE INDEX idx_dm_user_a ON public.dm_conversations(user_a);
CREATE INDEX idx_dm_user_b ON public.dm_conversations(user_b);

CREATE OR REPLACE FUNCTION public.normalize_dm_pair()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.user_a > NEW.user_b THEN
    DECLARE tmp uuid := NEW.user_a;
    BEGIN
      NEW.user_a := NEW.user_b;
      NEW.user_b := tmp;
    END;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_normalize_dm_pair BEFORE INSERT ON public.dm_conversations
FOR EACH ROW EXECUTE FUNCTION public.normalize_dm_pair();

-- DM messages
CREATE TABLE public.dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dm_messages_conv ON public.dm_messages(conversation_id, created_at);

-- Voice participants
CREATE TABLE public.voice_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  username text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(channel_id, user_id)
);
CREATE INDEX idx_voice_channel ON public.voice_participants(channel_id);

-- WebRTC signaling
CREATE TABLE public.voice_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  from_user uuid NOT NULL,
  to_user uuid NOT NULL,
  kind text NOT NULL, -- 'offer' | 'answer' | 'ice'
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_signals_to ON public.voice_signals(to_user, created_at);

-- Helper functions (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_server_member(_server uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.server_members WHERE server_id = _server AND user_id = _user);
$$;

CREATE OR REPLACE FUNCTION public.is_server_admin(_server uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.server_members WHERE server_id = _server AND user_id = _user AND role IN ('owner','admin'));
$$;

CREATE OR REPLACE FUNCTION public.is_server_owner(_server uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.servers WHERE id = _server AND owner_id = _user);
$$;

CREATE OR REPLACE FUNCTION public.channel_server(_channel uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT server_id FROM public.channels WHERE id = _channel;
$$;

CREATE OR REPLACE FUNCTION public.is_dm_participant(_conv uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.dm_conversations WHERE id = _conv AND (user_a = _user OR user_b = _user));
$$;

-- Create server: also adds creator as owner member + default channels
CREATE OR REPLACE FUNCTION public.create_server(_name text, _icon text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.servers (name, icon_url, owner_id) VALUES (_name, _icon, auth.uid())
    RETURNING id INTO new_id;
  INSERT INTO public.server_members (server_id, user_id, role) VALUES (new_id, auth.uid(), 'owner');
  INSERT INTO public.channels (server_id, name, type, position) VALUES
    (new_id, 'general', 'text', 0),
    (new_id, 'General', 'voice', 1);
  RETURN new_id;
END;
$$;

-- Join by invite
CREATE OR REPLACE FUNCTION public.join_server_by_invite(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id INTO sid FROM public.servers WHERE invite_code = _code;
  IF sid IS NULL THEN RAISE EXCEPTION 'Invalid invite code'; END IF;
  INSERT INTO public.server_members (server_id, user_id, role)
    VALUES (sid, auth.uid(), 'member')
    ON CONFLICT (server_id, user_id) DO NOTHING;
  RETURN sid;
END;
$$;

-- Get or create DM conversation
CREATE OR REPLACE FUNCTION public.get_or_create_dm(_other uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid; a uuid; b uuid; cid uuid;
BEGIN
  me := auth.uid();
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF me = _other THEN RAISE EXCEPTION 'Cannot DM yourself'; END IF;
  IF me < _other THEN a := me; b := _other; ELSE a := _other; b := me; END IF;
  SELECT id INTO cid FROM public.dm_conversations WHERE user_a = a AND user_b = b;
  IF cid IS NULL THEN
    INSERT INTO public.dm_conversations (user_a, user_b) VALUES (a, b) RETURNING id INTO cid;
  END IF;
  RETURN cid;
END;
$$;

-- Enable RLS
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_signals ENABLE ROW LEVEL SECURITY;

-- Servers policies
CREATE POLICY "Members can view their servers" ON public.servers FOR SELECT
  USING (public.is_server_member(id, auth.uid()));
CREATE POLICY "Owner can update server" ON public.servers FOR UPDATE
  USING (owner_id = auth.uid());
CREATE POLICY "Owner can delete server" ON public.servers FOR DELETE
  USING (owner_id = auth.uid());
-- INSERT handled via create_server function only

-- Members policies
CREATE POLICY "Members can view co-members" ON public.server_members FOR SELECT
  USING (public.is_server_member(server_id, auth.uid()));
CREATE POLICY "Admins can update roles" ON public.server_members FOR UPDATE
  USING (public.is_server_admin(server_id, auth.uid()));
CREATE POLICY "Self leave or admin kick" ON public.server_members FOR DELETE
  USING (user_id = auth.uid() OR public.is_server_admin(server_id, auth.uid()));

-- Channels policies
CREATE POLICY "Members can view channels" ON public.channels FOR SELECT
  USING (public.is_server_member(server_id, auth.uid()));
CREATE POLICY "Admins manage channels insert" ON public.channels FOR INSERT
  WITH CHECK (public.is_server_admin(server_id, auth.uid()));
CREATE POLICY "Admins manage channels update" ON public.channels FOR UPDATE
  USING (public.is_server_admin(server_id, auth.uid()));
CREATE POLICY "Admins manage channels delete" ON public.channels FOR DELETE
  USING (public.is_server_admin(server_id, auth.uid()));

-- Messages
CREATE POLICY "Members read messages" ON public.messages FOR SELECT
  USING (public.is_server_member(public.channel_server(channel_id), auth.uid()));
CREATE POLICY "Members write messages" ON public.messages FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.is_server_member(public.channel_server(channel_id), auth.uid()));
CREATE POLICY "Author edits message" ON public.messages FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "Author or admin delete" ON public.messages FOR DELETE
  USING (user_id = auth.uid() OR public.is_server_admin(public.channel_server(channel_id), auth.uid()));

-- Reactions
CREATE POLICY "Members read reactions" ON public.message_reactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_id AND public.is_server_member(public.channel_server(m.channel_id), auth.uid())));
CREATE POLICY "Members add reaction" ON public.message_reactions FOR INSERT
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_id AND public.is_server_member(public.channel_server(m.channel_id), auth.uid())));
CREATE POLICY "Self remove reaction" ON public.message_reactions FOR DELETE
  USING (user_id = auth.uid());

-- DMs
CREATE POLICY "Participants read conversation" ON public.dm_conversations FOR SELECT
  USING (user_a = auth.uid() OR user_b = auth.uid());
CREATE POLICY "Auth user create conversation" ON public.dm_conversations FOR INSERT
  WITH CHECK (user_a = auth.uid() OR user_b = auth.uid());

CREATE POLICY "Participants read DM messages" ON public.dm_messages FOR SELECT
  USING (public.is_dm_participant(conversation_id, auth.uid()));
CREATE POLICY "Participants send DM messages" ON public.dm_messages FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.is_dm_participant(conversation_id, auth.uid()));
CREATE POLICY "Sender deletes DM" ON public.dm_messages FOR DELETE
  USING (user_id = auth.uid());

-- Voice participants
CREATE POLICY "Members see voice" ON public.voice_participants FOR SELECT
  USING (public.is_server_member(public.channel_server(channel_id), auth.uid()));
CREATE POLICY "Self join voice" ON public.voice_participants FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.is_server_member(public.channel_server(channel_id), auth.uid()));
CREATE POLICY "Self leave voice" ON public.voice_participants FOR DELETE
  USING (user_id = auth.uid());

-- Voice signals
CREATE POLICY "Recipient reads signals" ON public.voice_signals FOR SELECT
  USING (to_user = auth.uid());
CREATE POLICY "Sender writes signals" ON public.voice_signals FOR INSERT
  WITH CHECK (from_user = auth.uid());
CREATE POLICY "Recipient deletes signals" ON public.voice_signals FOR DELETE
  USING (to_user = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_signals;

-- Updated_at trigger
CREATE TRIGGER trg_servers_updated BEFORE UPDATE ON public.servers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_messages_updated BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();