
-- Revoke EXECUTE on internal helpers from anon/authenticated/public
REVOKE EXECUTE ON FUNCTION public.is_server_admin(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_server_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_server_owner(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_user_banned(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_dm_participant(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.channel_server(uuid) FROM PUBLIC, anon, authenticated;

-- Trigger functions should not be callable as RPC
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_forum_post_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_forum_reply() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_snippet_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_snippet_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.normalize_dm_pair() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Make sure user-facing RPCs are explicitly granted to authenticated only
REVOKE EXECUTE ON FUNCTION public.create_server(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_server(text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_or_create_dm(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_dm(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.join_server_by_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_server_by_invite(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.ban_member(uuid, uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ban_member(uuid, uuid, text, integer) TO authenticated;

-- Tighten public-bucket listing: limit SELECT on storage.objects to authenticated for chat/emojis
DROP POLICY IF EXISTS "Chat attachments public read" ON storage.objects;
CREATE POLICY "Chat attachments authenticated read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "Custom emojis public read" ON storage.objects;
CREATE POLICY "Custom emojis authenticated read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'custom-emojis');
