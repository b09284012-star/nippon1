ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_company boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.protect_profile_columns() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
    NEW.is_verified_seller := OLD.is_verified_seller;
    NEW.kyc_status := OLD.kyc_status;
    NEW.rating := OLD.rating;
    NEW.sales_count := OLD.sales_count;
    NEW.is_company := OLD.is_company;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, is_company)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name',''), split_part(NEW.email,'@',1)),
          COALESCE(NEW.raw_user_meta_data->>'account_type','') = 'company')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_private_info (user_id, full_name, phone, address, city, country)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), COALESCE(NEW.raw_user_meta_data->>'phone',''),
          COALESCE(NEW.raw_user_meta_data->>'address',''), NEW.raw_user_meta_data->>'city', NEW.raw_user_meta_data->>'country')
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.wallets (user_id, deposit_tag, deposit_address)
  VALUES (NEW.id, 'NPN-' || upper(substr(replace(NEW.id::text, '-', ''), 1, 12)), 'TGX9Q1uR3A9g1pXQMzVRG7bx9GErbuZyHx')
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  IF lower(COALESCE(NEW.email,'')) = 'b09284012@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.verified_company_ids() RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.profiles WHERE is_company AND is_verified_seller;
$$;
REVOKE EXECUTE ON FUNCTION public.verified_company_ids() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.verified_company_ids() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_company(_user_id uuid, _company boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  UPDATE public.profiles SET is_company = _company WHERE id = _user_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_set_company(uuid, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_set_company(uuid, boolean) TO authenticated;