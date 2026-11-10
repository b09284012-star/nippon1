CREATE OR REPLACE FUNCTION public.credit_deposit(_user_id uuid, _amount numeric, _reference text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _fee numeric; _net numeric;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'مبلغ غير صالح'; END IF;
  IF EXISTS (SELECT 1 FROM public.wallet_transactions WHERE reference = _reference AND type = 'deposit') THEN
    RETURN;
  END IF;
  _fee := round(_amount * 0.01, 2);
  _net := greatest(_amount - _fee, 0);
  UPDATE public.wallets SET balance = balance + _net, updated_at = now() WHERE user_id = _user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'المحفظة غير موجودة'; END IF;
  INSERT INTO public.wallet_transactions (user_id, type, amount, reference) VALUES (_user_id, 'deposit', _net, _reference);
  IF _amount > _net THEN
    INSERT INTO public.wallet_transactions (user_id, type, amount, reference) VALUES (_user_id, 'fee', -(_amount - _net), _reference);
  END IF;
END; $function$;