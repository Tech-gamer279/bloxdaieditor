
-- 1) Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) Reports: allow platform admins to view/update/delete server-less reports
DROP POLICY IF EXISTS "Reporter or admin view" ON public.reports;
DROP POLICY IF EXISTS "Admin updates report" ON public.reports;
DROP POLICY IF EXISTS "Admin deletes report" ON public.reports;

CREATE POLICY "Reporter or admin view" ON public.reports
  FOR SELECT USING (
    reporter_id = auth.uid()
    OR (server_id IS NOT NULL AND is_server_admin(server_id, auth.uid()))
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Admin updates report" ON public.reports
  FOR UPDATE USING (
    (server_id IS NOT NULL AND is_server_admin(server_id, auth.uid()))
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Admin deletes report" ON public.reports
  FOR DELETE USING (
    (server_id IS NOT NULL AND is_server_admin(server_id, auth.uid()))
    OR public.has_role(auth.uid(), 'admin')
  );

-- 3) chat-attachments: restrict SELECT to uploader or server members of the channel containing the attachment
DROP POLICY IF EXISTS "Chat attachments authenticated read" ON storage.objects;

CREATE POLICY "Chat attachments member read" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'chat-attachments'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.messages m
        WHERE m.attachment_url LIKE '%' || name
          AND public.is_server_member(public.channel_server(m.channel_id), auth.uid())
      )
    )
  );

-- Make bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';
