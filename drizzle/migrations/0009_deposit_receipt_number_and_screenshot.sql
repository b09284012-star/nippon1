ALTER TABLE public.deposit_requests
  ADD COLUMN IF NOT EXISTS receipt_number text,
  ADD COLUMN IF NOT EXISTS receipt_image_path text;

DROP FUNCTION IF EXISTS public.submit_deposit_confirmation(numeric, text);

CREATE OR REPLACE FUNCTION public.submit_deposit_confirmation(_amount numeric, _txid text, _receipt_number text DEFAULT NULL, _receipt_path text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $f$
DECLARE _uid uuid := auth.uid(); _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'مبلغ غير صالح'; END IF;
  IF _txid IS NULL OR length(trim(_txid)) < 10 THEN RAISE EXCEPTION 'رقم المعاملة غير صالح'; END IF;
  IF EXISTS (SELECT 1 FROM public.deposit_requests WHERE txid = trim(_txid)) THEN RAISE EXCEPTION 'رقم المعاملة مسجل مسبقًا'; END IF;
  IF _receipt_path IS NOT NULL AND _receipt_path NOT LIKE _uid::text || '/%' THEN RAISE EXCEPTION 'مسار الصورة غير صالح'; END IF;
  INSERT INTO public.deposit_requests (user_id, amount, txid, receipt_number, receipt_image_path)
  VALUES (_uid, _amount, trim(_txid), NULLIF(trim(coalesce(_receipt_number,'')),''), _receipt_path)
  RETURNING id INTO _id;
  RETURN _id;
END;
$f$;

REVOKE ALL ON FUNCTION public.submit_deposit_confirmation(numeric, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.submit_deposit_confirmation(numeric, text, text, text) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_list_deposits();

CREATE OR REPLACE FUNCTION public.admin_list_deposits()
RETURNS TABLE(id uuid, user_id uuid, display_name text, email text, amount numeric, txid text, receipt_number text, receipt_image_path text, status withdrawal_status, admin_note text, created_at timestamptz, processed_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $f$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  RETURN QUERY
  SELECT d.id, d.user_id, p.display_name, u.email::text, d.amount, d.txid, d.receipt_number, d.receipt_image_path, d.status, d.admin_note, d.created_at, d.processed_at
  FROM public.deposit_requests d
  LEFT JOIN public.profiles p ON p.id = d.user_id
  LEFT JOIN auth.users u ON u.id = d.user_id
  ORDER BY (d.status = 'pending') DESC, d.created_at DESC;
END;
$f$;

REVOKE ALL ON FUNCTION public.admin_list_deposits() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_deposits() TO authenticated;

CREATE POLICY dep_receipt_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'deposit-receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY dep_receipt_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'deposit-receipts' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
CREATE POLICY dep_receipt_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'deposit-receipts' AND (storage.foldername(name))[1] = auth.uid()::text);