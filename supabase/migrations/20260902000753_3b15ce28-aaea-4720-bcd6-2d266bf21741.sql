-- 1) wallet columns for per-user deposit identity
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS deposit_tag text,
  ADD COLUMN IF NOT EXISTS deposit_network text NOT NULL DEFAULT 'TRC20',
  ADD COLUMN IF NOT EXISTS deposit_currency text NOT NULL DEFAULT 'usdttrc20';

UPDATE public.wallets
SET deposit_tag = 'NPN-' || upper(substr(replace(user_id::text, '-', ''), 1, 12))
WHERE deposit_tag IS NULL;

ALTER TABLE public.wallets ALTER COLUMN deposit_tag SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS wallets_deposit_tag_key ON public.wallets (deposit_tag);

-- 2) new users get their own deposit tag
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.wallets (user_id, deposit_tag)
  VALUES (NEW.id, 'NPN-' || upper(substr(replace(NEW.id::text, '-', ''), 1, 12)))
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

-- 3) sale commission 5%
CREATE OR REPLACE FUNCTION public.create_escrow_order(_listing_id uuid, _shipping_address text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _l public.listings%ROWTYPE; _uid uuid := auth.uid(); _fee numeric; _order uuid; _bal numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  SELECT * INTO _l FROM public.listings WHERE id = _listing_id FOR UPDATE;
  IF NOT FOUND OR _l.status <> 'active' THEN RAISE EXCEPTION 'العرض غير متاح'; END IF;
  IF _l.seller_id = _uid THEN RAISE EXCEPTION 'لا يمكنك شراء عرضك'; END IF;
  SELECT balance INTO _bal FROM public.wallets WHERE user_id = _uid FOR UPDATE;
  IF _bal IS NULL OR _bal < _l.price_usd THEN RAISE EXCEPTION 'الرصيد غير كافٍ'; END IF;
  _fee := round(_l.price_usd * 0.05, 2);
  UPDATE public.wallets SET balance = balance - _l.price_usd, held = held + _l.price_usd, updated_at = now() WHERE user_id = _uid;
  INSERT INTO public.orders (listing_id, buyer_id, seller_id, amount, fee, status, shipping_address)
  VALUES (_listing_id, _uid, _l.seller_id, _l.price_usd, _fee, 'escrow_held', _shipping_address) RETURNING id INTO _order;
  INSERT INTO public.wallet_transactions (user_id, type, amount, reference) VALUES (_uid, 'escrow_hold', -_l.price_usd, _order::text);
  UPDATE public.listings SET status = 'sold' WHERE id = _listing_id;
  RETURN _order;
END; $function$;

-- 4) server-only deposit crediting with 1 USD flat fee
CREATE OR REPLACE FUNCTION public.credit_deposit(_user_id uuid, _amount numeric, _reference text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _fee numeric := 1; _net numeric;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'مبلغ غير صالح'; END IF;
  IF EXISTS (SELECT 1 FROM public.wallet_transactions WHERE reference = _reference AND type = 'deposit') THEN
    RETURN; -- idempotent: already processed
  END IF;
  _net := greatest(_amount - _fee, 0);
  UPDATE public.wallets SET balance = balance + _net, updated_at = now() WHERE user_id = _user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'المحفظة غير موجودة'; END IF;
  INSERT INTO public.wallet_transactions (user_id, type, amount, reference) VALUES (_user_id, 'deposit', _net, _reference);
  IF _amount > _net THEN
    INSERT INTO public.wallet_transactions (user_id, type, amount, reference) VALUES (_user_id, 'fee', -(_amount - _net), _reference);
  END IF;
END; $function$;

REVOKE ALL ON FUNCTION public.credit_deposit(uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_deposit(uuid, numeric, text) TO service_role;

-- 5) server-only setter for the provider deposit address
CREATE OR REPLACE FUNCTION public.set_deposit_address(_user_id uuid, _address text, _network text, _currency text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.wallets
  SET deposit_address = _address,
      deposit_network = COALESCE(_network, deposit_network),
      deposit_currency = COALESCE(_currency, deposit_currency),
      updated_at = now()
  WHERE user_id = _user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'المحفظة غير موجودة'; END IF;
END; $function$;

REVOKE ALL ON FUNCTION public.set_deposit_address(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_deposit_address(uuid, text, text, text) TO service_role;