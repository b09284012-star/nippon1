-- 0) Platform deposit address (TRC20)
ALTER TABLE public.wallets ALTER COLUMN deposit_address SET DEFAULT 'TGX9Q1uR3A9g1pXQMzVRG7bx9GErbuZyHx';
UPDATE public.wallets SET deposit_address = 'TGX9Q1uR3A9g1pXQMzVRG7bx9GErbuZyHx' WHERE deposit_address IS NULL;

-- 1) Bootstrap admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE lower(email) = 'b09284012@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.wallets (user_id, deposit_tag, deposit_address)
  VALUES (NEW.id, 'NPN-' || upper(substr(replace(NEW.id::text, '-', ''), 1, 12)), 'TGX9Q1uR3A9g1pXQMzVRG7bx9GErbuZyHx')
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  IF lower(COALESCE(NEW.email,'')) = 'b09284012@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2) Role management: admins only
CREATE POLICY roles_admin_insert ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY roles_admin_delete ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND user_id <> auth.uid());
GRANT INSERT, DELETE ON public.user_roles TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_user_role(_user_id uuid, _make_admin boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  IF _user_id = auth.uid() AND NOT _make_admin THEN RAISE EXCEPTION 'لا يمكنك إزالة صلاحيتك'; END IF;
  IF _make_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'user') ON CONFLICT DO NOTHING;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (id uuid, email text, display_name text, is_admin boolean, kyc_status kyc_status, balance numeric, held numeric, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  RETURN QUERY
  SELECT u.id, u.email::text, p.display_name,
         EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin'),
         p.kyc_status, COALESCE(w.balance,0), COALESCE(w.held,0), u.created_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.wallets w ON w.user_id = u.id
  ORDER BY u.created_at DESC;
END; $$;

-- 3) Withdrawals
CREATE TYPE public.withdrawal_status AS ENUM ('pending','completed','rejected');

CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  address text NOT NULL,
  network text NOT NULL DEFAULT 'TRC20',
  status public.withdrawal_status NOT NULL DEFAULT 'pending',
  reject_reason text,
  tx_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

GRANT SELECT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY wd_own_read ON public.withdrawals FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_withdrawals_updated_at BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric, _address text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _bal numeric; _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  IF _amount IS NULL OR _amount < 10 THEN RAISE EXCEPTION 'أقل مبلغ للسحب 10 دولار'; END IF;
  IF _address IS NULL OR length(trim(_address)) < 20 THEN RAISE EXCEPTION 'عنوان محفظة غير صالح'; END IF;
  SELECT balance INTO _bal FROM public.wallets WHERE user_id = _uid FOR UPDATE;
  IF _bal IS NULL OR _bal < _amount THEN RAISE EXCEPTION 'الرصيد غير كافٍ'; END IF;
  UPDATE public.wallets SET balance = balance - _amount, updated_at = now() WHERE user_id = _uid;
  INSERT INTO public.withdrawals (user_id, amount, address) VALUES (_uid, _amount, trim(_address)) RETURNING id INTO _id;
  INSERT INTO public.wallet_transactions (user_id, type, amount, status, reference)
  VALUES (_uid, 'withdrawal', -_amount, 'pending', _id::text);
  RETURN _id;
END; $$;

CREATE OR REPLACE FUNCTION public.approve_withdrawal(_id uuid, _tx_hash text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _w public.withdrawals%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  SELECT * INTO _w FROM public.withdrawals WHERE id = _id FOR UPDATE;
  IF NOT FOUND OR _w.status <> 'pending' THEN RAISE EXCEPTION 'حالة الطلب لا تسمح'; END IF;
  UPDATE public.withdrawals SET status = 'completed', tx_hash = _tx_hash, processed_at = now(), updated_at = now() WHERE id = _id;
  UPDATE public.wallet_transactions SET status = 'completed' WHERE reference = _id::text AND type = 'withdrawal';
END; $$;

CREATE OR REPLACE FUNCTION public.reject_withdrawal(_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _w public.withdrawals%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  SELECT * INTO _w FROM public.withdrawals WHERE id = _id FOR UPDATE;
  IF NOT FOUND OR _w.status <> 'pending' THEN RAISE EXCEPTION 'حالة الطلب لا تسمح'; END IF;
  UPDATE public.wallets SET balance = balance + _w.amount, updated_at = now() WHERE user_id = _w.user_id;
  UPDATE public.withdrawals SET status = 'rejected', reject_reason = _reason, processed_at = now(), updated_at = now() WHERE id = _id;
  UPDATE public.wallet_transactions SET status = 'rejected' WHERE reference = _id::text AND type = 'withdrawal';
  INSERT INTO public.wallet_transactions (user_id, type, amount, status, reference)
  VALUES (_w.user_id, 'withdrawal', _w.amount, 'refunded', _id::text);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_withdrawals()
RETURNS TABLE (id uuid, user_id uuid, display_name text, email text, amount numeric, address text, network text, status public.withdrawal_status, reject_reason text, created_at timestamptz, processed_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  RETURN QUERY
  SELECT w.id, w.user_id, p.display_name, u.email::text, w.amount, w.address, w.network, w.status, w.reject_reason, w.created_at, w.processed_at
  FROM public.withdrawals w
  LEFT JOIN public.profiles p ON p.id = w.user_id
  LEFT JOIN auth.users u ON u.id = w.user_id
  ORDER BY (w.status = 'pending') DESC, w.created_at DESC;
END; $$;