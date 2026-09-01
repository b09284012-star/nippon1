REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.create_escrow_order(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.mark_order_shipped(uuid, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.release_escrow(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.refund_escrow(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.open_dispute(uuid, text) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_escrow_order(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_order_shipped(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_escrow(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refund_escrow(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.open_dispute(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;