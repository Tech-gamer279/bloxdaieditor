ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

CREATE POLICY "Authenticated can view public servers"
ON public.servers FOR SELECT
TO authenticated
USING (is_public = true);

CREATE OR REPLACE FUNCTION public.list_public_servers()
RETURNS TABLE(id uuid, name text, icon_url text, invite_code text, member_count bigint, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.name, s.icon_url, s.invite_code,
    (SELECT count(*) FROM public.server_members m WHERE m.server_id = s.id) AS member_count,
    s.created_at
  FROM public.servers s
  WHERE s.is_public = true
  ORDER BY member_count DESC, s.created_at DESC
  LIMIT 100;
$$;

REVOKE EXECUTE ON FUNCTION public.list_public_servers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_public_servers() TO authenticated;

CREATE OR REPLACE FUNCTION public.join_public_server(_server uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.servers WHERE id = _server AND is_public = true) THEN
    RAISE EXCEPTION 'Server not found or not public';
  END IF;
  IF public.is_user_banned(_server, auth.uid()) THEN RAISE EXCEPTION 'You are banned from this server'; END IF;
  INSERT INTO public.server_members (server_id, user_id, role)
    VALUES (_server, auth.uid(), 'member')
    ON CONFLICT (server_id, user_id) DO NOTHING;
  RETURN _server;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.join_public_server(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_public_server(uuid) TO authenticated;