DROP POLICY IF EXISTS profiles_auth_read ON public.profiles;
CREATE POLICY profiles_owner_admin_read ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
REVOKE SELECT ON public.user_private_info FROM anon;
CREATE OR REPLACE FUNCTION public.public_profile_names(_ids uuid[])
RETURNS TABLE(id uuid, display_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT p.id, p.display_name FROM public.profiles p WHERE auth.uid() IS NOT NULL AND p.id = ANY(_ids) LIMIT 200; $$;
REVOKE ALL ON FUNCTION public.public_profile_names(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_profile_names(uuid[]) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.search_user_by_wallet(_tag text)
RETURNS TABLE(id uuid, display_name text, avatar_url text, is_verified_seller boolean, rating numeric, sales_count integer, deposit_tag text, created_at timestamp with time zone)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$ BEGIN
IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'غير مصرح'; END IF;
RETURN QUERY SELECT p.id, p.display_name, p.avatar_url, p.is_verified_seller, p.rating, p.sales_count, w.deposit_tag, p.created_at
FROM public.wallets w JOIN public.profiles p ON p.id = w.user_id
WHERE length(trim(_tag)) >= 4 AND upper(w.deposit_tag) LIKE '%' || upper(trim(_tag)) || '%' LIMIT 20;
END; $$;
REVOKE ALL ON FUNCTION public.search_user_by_wallet(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_user_by_wallet(text) TO authenticated, service_role;