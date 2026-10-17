CREATE FUNCTION public.regular_market_listing_cards(_country text DEFAULT '', _limit integer DEFAULT NULL)
RETURNS TABLE(id uuid,seller_id uuid,title text,brand text,model text,hashrate text,power_watts integer,condition text,price_usd numeric,warranty_months integer,location text,images text[],status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT l.id,l.seller_id,l.title,l.brand,l.model,l.hashrate,l.power_watts,l.condition,l.price_usd,l.warranty_months,l.location,l.images,l.status::text FROM public.listings l JOIN public.profiles p ON p.id=l.seller_id WHERE NOT p.is_company AND l.status='active' AND (coalesce(trim(_country),'')='' OR l.location=trim(_country)) ORDER BY l.created_at DESC LIMIT CASE WHEN _limit IS NULL THEN NULL ELSE greatest(1,least(_limit,100)) END;
$$;
REVOKE ALL ON FUNCTION public.regular_market_listing_cards(text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.regular_market_listing_cards(text,integer) TO anon,authenticated,service_role;
CREATE FUNCTION public.company_market_listings()
RETURNS TABLE(id uuid,seller_id uuid,title text,brand text,model text,hashrate text,power_watts integer,condition text,price_usd numeric,warranty_months integer,location text,images text[],status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT l.id,l.seller_id,l.title,l.brand,l.model,l.hashrate,l.power_watts,l.condition,l.price_usd,l.warranty_months,l.location,l.images,l.status::text FROM public.listings l JOIN public.profiles p ON p.id=l.seller_id WHERE p.is_company AND p.is_verified_seller AND l.status='active' ORDER BY l.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.company_market_listings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.company_market_listings() TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.company_directory() RETURNS TABLE(user_id uuid,company_name text,logo_path text,contact_email text,contact_phone text,website text,description text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT p.id,coalesce(nullif(c.company_name,''),p.display_name),c.logo_path,coalesce(c.contact_email,''),coalesce(c.contact_phone,''),coalesce(c.website,''),coalesce(c.description,'') FROM public.profiles p LEFT JOIN public.company_profiles c ON c.user_id=p.id WHERE p.is_company AND p.is_verified_seller ORDER BY p.display_name;
$$;
REVOKE ALL ON FUNCTION public.company_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.company_directory() TO anon,authenticated,service_role;
CREATE FUNCTION public.is_public_inventory_image(_name text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.listings l JOIN public.profiles p ON p.id=l.seller_id WHERE l.status='active' AND (NOT p.is_company OR p.is_verified_seller) AND _name=ANY(l.images)); $$;
REVOKE ALL ON FUNCTION public.is_public_inventory_image(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_public_inventory_image(text) TO anon,authenticated,service_role;
CREATE POLICY public_inventory_image_read ON storage.objects FOR SELECT TO anon,authenticated USING(bucket_id='listing-images' AND public.is_public_inventory_image(name));
CREATE POLICY public_company_logo_read ON storage.objects FOR SELECT TO anon USING(bucket_id='company-logos' AND EXISTS(SELECT 1 FROM public.company_directory() c WHERE c.logo_path=name));