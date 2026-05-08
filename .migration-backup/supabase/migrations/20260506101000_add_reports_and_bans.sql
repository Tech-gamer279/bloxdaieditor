-- Add support for reporting messages and banning members

CREATE TABLE public.message_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  reported_by uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_message_reports_message ON public.message_reports(message_id);

CREATE TABLE public.server_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  banned_by uuid NOT NULL,
  reason text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(server_id, user_id)
);
CREATE INDEX idx_server_bans_server ON public.server_bans(server_id);
CREATE INDEX idx_server_bans_user ON public.server_bans(user_id);

CREATE OR REPLACE FUNCTION public.is_server_banned(_server uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.server_bans
    WHERE server_id = _server
      AND user_id = _user
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.ban_server_member(
  _server_id uuid,
  _user_id uuid,
  _duration_days integer,
  _reason text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  expires timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.is_server_admin(_server_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot ban yourself';
  END IF;

  IF public.is_server_owner(_server_id, _user_id) THEN
    RAISE EXCEPTION 'Cannot ban the server owner';
  END IF;

  IF _duration_days IS NULL OR _duration_days <= 0 THEN
    expires := NULL;
  ELSE
    expires := now() + (_duration_days || ' days')::interval;
  END IF;

  INSERT INTO public.server_bans (server_id, user_id, banned_by, reason, expires_at)
  VALUES (_server_id, _user_id, auth.uid(), _reason, expires)
  ON CONFLICT (server_id, user_id) DO UPDATE
    SET banned_by = auth.uid(), reason = EXCLUDED.reason, expires_at = EXCLUDED.expires_at, created_at = now();

  DELETE FROM public.server_members WHERE server_id = _server_id AND user_id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.report_message(_message_id uuid, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.message_reports (message_id, reported_by, reason)
  VALUES (_message_id, auth.uid(), _reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.join_server_by_invite(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT id INTO sid FROM public.servers WHERE invite_code = _code;
  IF sid IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;
  IF public.is_server_banned(sid, auth.uid()) THEN
    RAISE EXCEPTION 'You are banned from this server';
  END IF;
  INSERT INTO public.server_members (server_id, user_id, role)
    VALUES (sid, auth.uid(), 'member')
    ON CONFLICT (server_id, user_id) DO NOTHING;
  RETURN sid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ban_server_member(uuid, uuid, integer, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.report_message(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_server_banned(uuid, uuid) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.ban_server_member(uuid, uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_message(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_server_banned(uuid, uuid) TO authenticated;
