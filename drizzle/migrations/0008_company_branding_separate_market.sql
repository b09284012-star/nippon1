CREATE TABLE public.company_profiles (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 company_name text NOT NULL DEFAULT '' CHECK (char_length(company_name) <= 100),
 logo_path text,
 contact_email text NOT NULL DEFAULT '' CHECK (char_length(contact_email) <= 255),
 contact_phone text NOT NULL DEFAULT '' CHECK (char_length(contact_phone) <= 40),
 website text NOT NULL DEFAULT '' CHECK (char_length(website) <= 300),
 description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 1000)
);
GRANT SELECT, INSERT, UPDATE ON public.company_profiles TO authenticated;
GRANT ALL ON public.company_profiles TO service_role;
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY company_profile_owner_admin_read ON public.company_profiles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY company_profile_insert ON public.company_profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_company)));
CREATE POLICY company_profile_update ON public.company_profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_company))) WITH CHECK (public.has_role(auth.uid(),'admin') OR (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_company)));
COMMENT ON TABLE public.company_profiles IS 'Business branding and contact details explicitly supplied for display, never private account contact data.';
CREATE FUNCTION public.company_directory() RETURNS TABLE (user_id uuid, company_name text, logo_path text, contact_email text, contact_phone text, website text, description text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT p.id, coalesce(nullif(c.company_name,''),p.display_name), c.logo_path, coalesce(c.contact_email,''), coalesce(c.contact_phone,''), coalesce(c.website,''), coalesce(c.description,'') FROM public.profiles p LEFT JOIN public.company_profiles c ON c.user_id=p.id WHERE p.is_company AND p.is_verified_seller AND auth.uid() IS NOT NULL ORDER BY p.display_name;
$$;
REVOKE ALL ON FUNCTION public.company_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.company_directory() TO authenticated, service_role;
CREATE FUNCTION public.regular_market_listings(_country text, _limit integer DEFAULT NULL) RETURNS SETOF public.listings LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT l.* FROM public.listings l JOIN public.profiles p ON p.id=l.seller_id WHERE auth.uid() IS NOT NULL AND NOT p.is_company AND l.status='active' AND l.location=_country ORDER BY l.created_at DESC LIMIT CASE WHEN _limit IS NULL THEN NULL ELSE greatest(1,least(_limit,100)) END;
$$;
REVOKE ALL ON FUNCTION public.regular_market_listings(text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.regular_market_listings(text,integer) TO authenticated, service_role;
CREATE POLICY company_logo_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id='company-logos' AND (owner_id=auth.uid()::text OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.company_directory() c WHERE c.logo_path=name)));
CREATE POLICY company_logo_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='company-logos' AND (storage.foldername(name))[1]=auth.uid()::text AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.is_company));
CREATE POLICY company_logo_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id='company-logos' AND owner_id=auth.uid()::text);