
-- 1. Sanitize email-style usernames in profiles
UPDATE public.profiles
SET username = split_part(username, '@', 1)
WHERE username LIKE '%@%';

-- 2. Sanitize email-style author_name in forum tables
UPDATE public.forum_posts SET author_name = split_part(author_name, '@', 1) WHERE author_name LIKE '%@%';
UPDATE public.forum_replies SET author_name = split_part(author_name, '@', 1) WHERE author_name LIKE '%@%';

-- 3. Update handle_new_user to derive username from email local-part, not full email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'user')
  );
  RETURN NEW;
END;
$$;

-- 4. Restrict profiles SELECT to authenticated users (still readable to all signed-in users for display)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- 5. Restrict forum_posts and forum_replies SELECT to authenticated users
DROP POLICY IF EXISTS "Forum posts are viewable by everyone" ON public.forum_posts;
CREATE POLICY "Authenticated users can view forum posts"
  ON public.forum_posts FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Forum replies are viewable by everyone" ON public.forum_replies;
CREATE POLICY "Authenticated users can view forum replies"
  ON public.forum_replies FOR SELECT
  TO authenticated
  USING (true);

-- 6. server_bots: restrict SELECT to server admins (was: any member)
DROP POLICY IF EXISTS "Members view bots" ON public.server_bots;
CREATE POLICY "Admins view bots"
  ON public.server_bots FOR SELECT
  USING (public.is_server_admin(server_id, auth.uid()));

-- 7. Add explicit INSERT policies for servers and server_members so RLS is intentional
CREATE POLICY "Owner can create server"
  ON public.servers FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Self can join server"
  ON public.server_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 8. Tighten custom-emojis storage bucket policies (require server admin)
DROP POLICY IF EXISTS "Auth upload custom emoji" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete own custom emoji" ON storage.objects;

CREATE POLICY "Server admin upload custom emoji"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'custom-emojis'
    AND public.is_server_admin(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
  );

CREATE POLICY "Server admin delete custom emoji"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'custom-emojis'
    AND public.is_server_admin(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
  );
