ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified_seller boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.profiles.kyc_status IS 'DEPRECATED: KYC removed, replaced by is_verified_seller';
COMMENT ON TABLE public.kyc_submissions IS 'DEPRECATED: KYC removed';
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS fee numeric NOT NULL DEFAULT 0;

CREATE TABLE public.user_private_info (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  city text,
  country text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_private_info TO authenticated;
GRANT ALL ON public.user_private_info TO service_role;
ALTER TABLE public.user_private_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY upi_read ON public.user_private_info FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY upi_insert ON public.user_private_info FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY upi_update ON public.user_private_info FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- protect privileged profile columns
CREATE OR REPLACE FUNCTION public.protect_profile_columns() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
    NEW.is_verified_seller := OLD.is_verified_seller;
    NEW.kyc_status := OLD.kyc_status;
    NEW.rating := OLD.rating;
    NEW.sales_count := OLD.sales_count;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_protect_profile ON public.profiles;
CREATE TRIGGER trg_protect_profile BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name',''), split_part(NEW.email,'@',1)))
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

-- listings: only verified sellers (or admins) can publish
DROP POLICY IF EXISTS listings_seller_insert ON public.listings;
CREATE POLICY listings_seller_insert ON public.listings FOR INSERT TO authenticated WITH CHECK (
  seller_id = auth.uid() AND (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_verified_seller)));

CREATE OR REPLACE FUNCTION public.admin_set_verified_seller(_user_id uuid, _verified boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  UPDATE public.profiles SET is_verified_seller = _verified WHERE id = _user_id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_users_full() RETURNS TABLE(id uuid, email text, display_name text, full_name text, phone text, address text, city text, country text, deposit_tag text, is_admin boolean, is_verified_seller boolean, balance numeric, held numeric, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  RETURN QUERY
  SELECT u.id, u.email::text, p.display_name, i.full_name, i.phone, i.address, i.city, i.country, w.deposit_tag,
    EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role='admin'),
    COALESCE(p.is_verified_seller,false), COALESCE(w.balance,0), COALESCE(w.held,0), u.created_at
  FROM auth.users u LEFT JOIN public.profiles p ON p.id=u.id LEFT JOIN public.user_private_info i ON i.user_id=u.id LEFT JOIN public.wallets w ON w.user_id=u.id
  ORDER BY u.created_at DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.search_user_by_wallet(_tag text) RETURNS TABLE(id uuid, display_name text, avatar_url text, is_verified_seller boolean, rating numeric, sales_count integer, deposit_tag text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.display_name, p.avatar_url, p.is_verified_seller, p.rating, p.sales_count, w.deposit_tag, p.created_at
  FROM public.wallets w JOIN public.profiles p ON p.id = w.user_id
  WHERE auth.uid() IS NOT NULL AND length(trim(_tag)) >= 4 AND upper(w.deposit_tag) LIKE '%' || upper(trim(_tag)) || '%'
  LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION public.admin_finance_summary() RETURNS TABLE(listed_value numeric, listed_count bigint, expected_fees numeric, earned_fees numeric, held_fees numeric, withdrawal_fees numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  RETURN QUERY SELECT
    COALESCE((SELECT sum(price_usd * GREATEST(quantity,1)) FROM public.listings WHERE status='active'),0),
    (SELECT count(*) FROM public.listings WHERE status='active'),
    round(COALESCE((SELECT sum(price_usd * GREATEST(quantity,1)) FROM public.listings WHERE status='active'),0) * 0.025, 2),
    COALESCE((SELECT sum(fee) FROM public.orders WHERE status='completed'),0),
    COALESCE((SELECT sum(fee) FROM public.orders WHERE status IN ('escrow_held','shipped','disputed')),0),
    COALESCE((SELECT sum(fee) FROM public.withdrawals WHERE status='completed'),0);
END; $$;

CREATE OR REPLACE FUNCTION public.create_escrow_order(_listing_id uuid, _shipping_address text, _quantity integer DEFAULT 1)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _l public.listings%ROWTYPE; _uid uuid := auth.uid(); _fee numeric; _order uuid; _bal numeric; _qty integer; _total numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  _qty := GREATEST(COALESCE(_quantity, 1), 1);
  SELECT * INTO _l FROM public.listings WHERE id = _listing_id FOR UPDATE;
  IF NOT FOUND OR _l.status <> 'active' THEN RAISE EXCEPTION 'العرض غير متاح'; END IF;
  IF _l.seller_id = _uid THEN RAISE EXCEPTION 'لا يمكنك شراء عرضك'; END IF;
  IF _l.availability = 'in_stock' AND _qty > _l.quantity THEN RAISE EXCEPTION 'الكمية المطلوبة غير متوفرة'; END IF;
  _total := _l.price_usd * _qty;
  SELECT balance INTO _bal FROM public.wallets WHERE user_id = _uid FOR UPDATE;
  IF _bal IS NULL OR _bal < _total THEN RAISE EXCEPTION 'الرصيد غير كافٍ'; END IF;
  _fee := round(_total * 0.025, 2);
  UPDATE public.wallets SET balance = balance - _total, held = held + _total, updated_at = now() WHERE user_id = _uid;
  INSERT INTO public.orders (listing_id, buyer_id, seller_id, amount, fee, status, shipping_address, quantity)
  VALUES (_listing_id, _uid, _l.seller_id, _total, _fee, 'escrow_held', _shipping_address, _qty) RETURNING id INTO _order;
  INSERT INTO public.wallet_transactions (user_id, type, amount, reference) VALUES (_uid, 'escrow_hold', -_total, _order::text);
  IF _l.availability = 'in_stock' THEN
    UPDATE public.listings SET quantity = quantity - _qty, status = CASE WHEN quantity - _qty <= 0 THEN 'sold' ELSE status END WHERE id = _listing_id;
  END IF;
  RETURN _order;
END; $function$;

CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric, _address text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _uid uuid := auth.uid(); _bal numeric; _id uuid; _fee numeric := 2.5;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  IF _amount IS NULL OR _amount < 10 THEN RAISE EXCEPTION 'أقل مبلغ للسحب 10 دولار'; END IF;
  IF _address IS NULL OR length(trim(_address)) < 20 THEN RAISE EXCEPTION 'عنوان محفظة غير صالح'; END IF;
  SELECT balance INTO _bal FROM public.wallets WHERE user_id = _uid FOR UPDATE;
  IF _bal IS NULL OR _bal < _amount + _fee THEN RAISE EXCEPTION 'الرصيد غير كافٍ (المبلغ + رسوم السحب 2.5 دولار)'; END IF;
  UPDATE public.wallets SET balance = balance - (_amount + _fee), updated_at = now() WHERE user_id = _uid;
  INSERT INTO public.withdrawals (user_id, amount, address, fee) VALUES (_uid, _amount, trim(_address), _fee) RETURNING id INTO _id;
  INSERT INTO public.wallet_transactions (user_id, type, amount, status, reference)
  VALUES (_uid, 'withdrawal', -(_amount + _fee), 'pending', _id::text);
  RETURN _id;
END; $function$;

CREATE OR REPLACE FUNCTION public.reject_withdrawal(_id uuid, _reason text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _w public.withdrawals%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  SELECT * INTO _w FROM public.withdrawals WHERE id = _id FOR UPDATE;
  IF NOT FOUND OR _w.status <> 'pending' THEN RAISE EXCEPTION 'حالة الطلب لا تسمح'; END IF;
  UPDATE public.wallets SET balance = balance + _w.amount + _w.fee, updated_at = now() WHERE user_id = _w.user_id;
  UPDATE public.withdrawals SET status = 'rejected', reject_reason = _reason, processed_at = now(), updated_at = now() WHERE id = _id;
  UPDATE public.wallet_transactions SET status = 'rejected' WHERE reference = _id::text AND type = 'withdrawal';
  INSERT INTO public.wallet_transactions (user_id, type, amount, status, reference)
  VALUES (_w.user_id, 'withdrawal', _w.amount + _w.fee, 'refunded', _id::text);
END; $function$;

REVOKE EXECUTE ON FUNCTION public.admin_set_verified_seller(uuid, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_users_full() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.search_user_by_wallet(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_finance_summary() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.protect_profile_columns() FROM anon, public, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_verified_seller(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_users_full() TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_user_by_wallet(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_finance_summary() TO authenticated;