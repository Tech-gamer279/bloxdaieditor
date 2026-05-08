REVOKE EXECUTE ON FUNCTION public.create_server(text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.join_server_by_invite(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_or_create_dm(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_server_member(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_server_admin(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_server_owner(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.channel_server(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_dm_participant(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.normalize_dm_pair() FROM anon, public;

GRANT EXECUTE ON FUNCTION public.create_server(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_server_by_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_dm(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_server_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_server_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_server_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.channel_server(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_dm_participant(uuid, uuid) TO authenticated;