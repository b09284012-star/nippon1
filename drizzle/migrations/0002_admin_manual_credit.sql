CREATE OR REPLACE FUNCTION public.admin_credit_user(_user_id uuid, _amount numeric, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _amount IS NULL OR _amount = 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;
  UPDATE public.wallets SET balance = balance + _amount, updated_at = now() WHERE user_id = _user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'WALLET_NOT_FOUND'; END IF;
  IF (SELECT balance FROM public.wallets WHERE user_id = _user_id) < 0 THEN RAISE EXCEPTION 'NEGATIVE_BALANCE'; END IF;
  INSERT INTO public.wallet_transactions(user_id, type, amount, status, reference)
  VALUES (_user_id, CASE WHEN _amount > 0 THEN 'deposit'::tx_type ELSE 'withdrawal'::tx_type END, abs(_amount), 'completed', 'ADMIN: ' || coalesce(_note, 'تعديل يدوي'));
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_credit_user(uuid, numeric, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_credit_user(uuid, numeric, text) TO authenticated;