-- Deposit confirmation no longer asks the user for a transaction number (TxID) or a transfer receipt number.
-- The system now generates its own internal deposit reference instead.
DROP FUNCTION IF EXISTS public.submit_deposit_confirmation(numeric, text, text, text);

CREATE OR REPLACE FUNCTION public.submit_deposit_confirmation(_amount numeric, _receipt_path text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $f$
DECLARE _uid uuid := auth.uid(); _id uuid; _ref text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'مبلغ غير صالح'; END IF;
  IF _receipt_path IS NOT NULL AND _receipt_path NOT LIKE _uid::text || '/%' THEN RAISE EXCEPTION 'مسار الصورة غير صالح'; END IF;
  _ref := to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  INSERT INTO public.deposit_requests (user_id, amount, txid, receipt_image_path)
  VALUES (_uid, _amount, _ref, _receipt_path)
  RETURNING id INTO _id;
  RETURN _id;
END;
$f$;

REVOKE ALL ON FUNCTION public.submit_deposit_confirmation(numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.submit_deposit_confirmation(numeric, text) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_list_deposits();

CREATE OR REPLACE FUNCTION public.admin_list_deposits()
RETURNS TABLE(id uuid, user_id uuid, display_name text, email text, amount numeric, txid text, receipt_image_path text, status withdrawal_status, admin_note text, created_at timestamptz, processed_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $f$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  RETURN QUERY
  SELECT d.id, d.user_id, p.display_name, u.email::text, d.amount, d.txid, d.receipt_image_path, d.status, d.admin_note, d.created_at, d.processed_at
  FROM public.deposit_requests d
  LEFT JOIN public.profiles p ON p.id = d.user_id
  LEFT JOIN auth.users u ON u.id = d.user_id
  ORDER BY (d.status = 'pending') DESC, d.created_at DESC;
END;
$f$;

REVOKE ALL ON FUNCTION public.admin_list_deposits() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_deposits() TO authenticated;

COMMENT ON COLUMN public.deposit_requests.receipt_number IS 'DEPRECATED: لم يعد رقم إيصال التحويل مطلوبًا من المستخدم';
COMMENT ON COLUMN public.deposit_requests.txid IS 'مرجع إيداع يولده النظام تلقائيًا؛ لم يعد المستخدم يُدخل رقم المعاملة';