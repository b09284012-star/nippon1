CREATE TABLE public.deposit_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  txid text NOT NULL,
  status withdrawal_status NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
GRANT SELECT, INSERT ON public.deposit_requests TO authenticated;
GRANT ALL ON public.deposit_requests TO service_role;
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY dep_own_read ON public.deposit_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.submit_deposit_confirmation(_amount numeric, _txid text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $f$
DECLARE _uid uuid := auth.uid(); _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'مبلغ غير صالح'; END IF;
  IF _txid IS NULL OR length(trim(_txid)) < 10 THEN RAISE EXCEPTION 'رقم المعاملة غير صالح'; END IF;
  IF EXISTS (SELECT 1 FROM public.deposit_requests WHERE txid = trim(_txid)) THEN RAISE EXCEPTION 'رقم المعاملة مسجل مسبقًا'; END IF;
  INSERT INTO public.deposit_requests (user_id, amount, txid) VALUES (_uid, _amount, trim(_txid)) RETURNING id INTO _id;
  RETURN _id;
END;
$f$;

CREATE OR REPLACE FUNCTION public.admin_list_deposits()
RETURNS TABLE(id uuid, user_id uuid, display_name text, email text, amount numeric, txid text, status withdrawal_status, admin_note text, created_at timestamptz, processed_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $f$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  RETURN QUERY
  SELECT d.id, d.user_id, p.display_name, u.email::text, d.amount, d.txid, d.status, d.admin_note, d.created_at, d.processed_at
  FROM public.deposit_requests d
  LEFT JOIN public.profiles p ON p.id = d.user_id
  LEFT JOIN auth.users u ON u.id = d.user_id
  ORDER BY (d.status = 'pending') DESC, d.created_at DESC;
END;
$f$;

CREATE OR REPLACE FUNCTION public.approve_deposit(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $f$
DECLARE _d public.deposit_requests%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  SELECT * INTO _d FROM public.deposit_requests WHERE id = _id FOR UPDATE;
  IF NOT FOUND OR _d.status <> 'pending' THEN RAISE EXCEPTION 'حالة الطلب لا تسمح'; END IF;
  UPDATE public.deposit_requests SET status = 'completed', processed_at = now() WHERE id = _id;
  PERFORM public.credit_deposit(_d.user_id, _d.amount, 'depreq:' || _id::text);
END;
$f$;

CREATE OR REPLACE FUNCTION public.reject_deposit(_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $f$
DECLARE _d public.deposit_requests%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  SELECT * INTO _d FROM public.deposit_requests WHERE id = _id FOR UPDATE;
  IF NOT FOUND OR _d.status <> 'pending' THEN RAISE EXCEPTION 'حالة الطلب لا تسمح'; END IF;
  UPDATE public.deposit_requests SET status = 'rejected', admin_note = _reason, processed_at = now() WHERE id = _id;
END;
$f$;

REVOKE ALL ON FUNCTION public.submit_deposit_confirmation(numeric, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_list_deposits() FROM public, anon;
REVOKE ALL ON FUNCTION public.approve_deposit(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.reject_deposit(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.submit_deposit_confirmation(numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_deposits() TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_deposit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_deposit(uuid, text) TO authenticated;