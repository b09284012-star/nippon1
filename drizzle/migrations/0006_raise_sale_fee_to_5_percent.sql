CREATE OR REPLACE FUNCTION public.admin_finance_summary() RETURNS TABLE(listed_value numeric, listed_count bigint, expected_fees numeric, earned_fees numeric, held_fees numeric, withdrawal_fees numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  RETURN QUERY SELECT
    COALESCE((SELECT sum(price_usd * GREATEST(quantity,1)) FROM public.listings WHERE status='active'),0),
    (SELECT count(*) FROM public.listings WHERE status='active'),
    round(COALESCE((SELECT sum(price_usd * GREATEST(quantity,1)) FROM public.listings WHERE status='active'),0) * 0.05, 2),
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
  _fee := round(_total * 0.05, 2);
  UPDATE public.wallets SET balance = balance - _total, held = held + _total, updated_at = now() WHERE user_id = _uid;
  INSERT INTO public.orders (listing_id, buyer_id, seller_id, amount, fee, status, shipping_address, quantity)
  VALUES (_listing_id, _uid, _l.seller_id, _total, _fee, 'escrow_held', _shipping_address, _qty) RETURNING id INTO _order;
  INSERT INTO public.wallet_transactions (user_id, type, amount, reference) VALUES (_uid, 'escrow_hold', -_total, _order::text);
  IF _l.availability = 'in_stock' THEN
    UPDATE public.listings SET quantity = quantity - _qty, status = CASE WHEN quantity - _qty <= 0 THEN 'sold' ELSE status END WHERE id = _listing_id;
  END IF;
  RETURN _order;
END; $function$;