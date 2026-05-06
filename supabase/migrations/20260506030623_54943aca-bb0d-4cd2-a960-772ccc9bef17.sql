
-- Custom server roles
CREATE TABLE public.server_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#a78bfa',
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.server_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view roles" ON public.server_roles FOR SELECT USING (is_server_member(server_id, auth.uid()));
CREATE POLICY "Admins insert roles" ON public.server_roles FOR INSERT WITH CHECK (is_server_admin(server_id, auth.uid()));
CREATE POLICY "Admins update roles" ON public.server_roles FOR UPDATE USING (is_server_admin(server_id, auth.uid()));
CREATE POLICY "Admins delete roles" ON public.server_roles FOR DELETE USING (is_server_admin(server_id, auth.uid()));

-- Role assignments
CREATE TABLE public.server_member_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role_id uuid NOT NULL REFERENCES public.server_roles(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_id)
);
ALTER TABLE public.server_member_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view role assignments" ON public.server_member_roles FOR SELECT USING (is_server_member(server_id, auth.uid()));
CREATE POLICY "Admins assign roles" ON public.server_member_roles FOR INSERT WITH CHECK (is_server_admin(server_id, auth.uid()));
CREATE POLICY "Admins remove roles" ON public.server_member_roles FOR DELETE USING (is_server_admin(server_id, auth.uid()));

-- Bans
CREATE TABLE public.server_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  banned_by uuid NOT NULL,
  reason text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (server_id, user_id)
);
ALTER TABLE public.server_bans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view bans" ON public.server_bans FOR SELECT USING (is_server_admin(server_id, auth.uid()));
CREATE POLICY "Admins create bans" ON public.server_bans FOR INSERT WITH CHECK (is_server_admin(server_id, auth.uid()) AND banned_by = auth.uid());
CREATE POLICY "Admins remove bans" ON public.server_bans FOR DELETE USING (is_server_admin(server_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.is_user_banned(_server uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.server_bans
    WHERE server_id = _server AND user_id = _user
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- Update join function to check ban
CREATE OR REPLACE FUNCTION public.join_server_by_invite(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id INTO sid FROM public.servers WHERE invite_code = _code;
  IF sid IS NULL THEN RAISE EXCEPTION 'Invalid invite code'; END IF;
  IF public.is_user_banned(sid, auth.uid()) THEN RAISE EXCEPTION 'You are banned from this server'; END IF;
  INSERT INTO public.server_members (server_id, user_id, role)
    VALUES (sid, auth.uid(), 'member')
    ON CONFLICT (server_id, user_id) DO NOTHING;
  RETURN sid;
END;
$$;

-- Ban action helper: remove member when banned
CREATE OR REPLACE FUNCTION public.ban_member(_server uuid, _user uuid, _reason text, _days int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_server_admin(_server, auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  INSERT INTO public.server_bans (server_id, user_id, banned_by, reason, expires_at)
    VALUES (_server, _user, auth.uid(), _reason,
      CASE WHEN _days IS NULL OR _days <= 0 THEN NULL ELSE now() + (_days || ' days')::interval END)
    ON CONFLICT (server_id, user_id) DO UPDATE
      SET reason = EXCLUDED.reason, expires_at = EXCLUDED.expires_at, banned_by = EXCLUDED.banned_by;
  DELETE FROM public.server_members WHERE server_id = _server AND user_id = _user AND role <> 'owner';
END;
$$;

-- Reports
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid REFERENCES public.servers(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  target_user_id uuid,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reporter or admin view" ON public.reports FOR SELECT USING (
  reporter_id = auth.uid() OR (server_id IS NOT NULL AND is_server_admin(server_id, auth.uid()))
);
CREATE POLICY "Auth user reports" ON public.reports FOR INSERT WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Admin updates report" ON public.reports FOR UPDATE USING (server_id IS NOT NULL AND is_server_admin(server_id, auth.uid()));
CREATE POLICY "Admin deletes report" ON public.reports FOR DELETE USING (server_id IS NOT NULL AND is_server_admin(server_id, auth.uid()));

-- Server posts (announcements)
CREATE TABLE public.server_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  author_name text NOT NULL DEFAULT 'anonymous',
  title text NOT NULL,
  content text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.server_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view posts" ON public.server_posts FOR SELECT USING (is_server_member(server_id, auth.uid()));
CREATE POLICY "Members create posts" ON public.server_posts FOR INSERT WITH CHECK (user_id = auth.uid() AND is_server_member(server_id, auth.uid()));
CREATE POLICY "Author or admin edit post" ON public.server_posts FOR UPDATE USING (user_id = auth.uid() OR is_server_admin(server_id, auth.uid()));
CREATE POLICY "Author or admin delete post" ON public.server_posts FOR DELETE USING (user_id = auth.uid() OR is_server_admin(server_id, auth.uid()));
CREATE TRIGGER update_server_posts_updated_at BEFORE UPDATE ON public.server_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Server bots
CREATE TABLE public.server_bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  bot_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  installed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (server_id, bot_key)
);
ALTER TABLE public.server_bots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view bots" ON public.server_bots FOR SELECT USING (is_server_member(server_id, auth.uid()));
CREATE POLICY "Admins install bots" ON public.server_bots FOR INSERT WITH CHECK (is_server_admin(server_id, auth.uid()));
CREATE POLICY "Admins update bots" ON public.server_bots FOR UPDATE USING (is_server_admin(server_id, auth.uid()));
CREATE POLICY "Admins remove bots" ON public.server_bots FOR DELETE USING (is_server_admin(server_id, auth.uid()));

-- Custom emojis
CREATE TABLE public.custom_emojis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  name text NOT NULL,
  image_url text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (server_id, name)
);
ALTER TABLE public.custom_emojis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view emojis" ON public.custom_emojis FOR SELECT USING (is_server_member(server_id, auth.uid()));
CREATE POLICY "Admins add emoji" ON public.custom_emojis FOR INSERT WITH CHECK (is_server_admin(server_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Admins delete emoji" ON public.custom_emojis FOR DELETE USING (is_server_admin(server_id, auth.uid()));

-- Message attachments
ALTER TABLE public.messages ADD COLUMN attachment_url text;
ALTER TABLE public.messages ADD COLUMN attachment_type text;
ALTER TABLE public.messages ADD COLUMN attachment_name text;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('custom-emojis', 'custom-emojis', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Chat attachments public read" ON storage.objects FOR SELECT USING (bucket_id = 'chat-attachments');
CREATE POLICY "Auth upload chat attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid() IS NOT NULL AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owner deletes chat attachment" ON storage.objects FOR DELETE USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Custom emojis public read" ON storage.objects FOR SELECT USING (bucket_id = 'custom-emojis');
CREATE POLICY "Auth upload custom emoji" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'custom-emojis' AND auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete own custom emoji" ON storage.objects FOR DELETE USING (bucket_id = 'custom-emojis' AND auth.uid() IS NOT NULL);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_roles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_member_roles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_bans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_emojis;
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_bots;
