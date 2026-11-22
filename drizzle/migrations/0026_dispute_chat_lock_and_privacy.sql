CREATE OR REPLACE FUNCTION public._account_country(_user_id uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$ SELECT NULLIF(trim(country),'') FROM public.user_private_info WHERE user_id=_user_id; $$;
REVOKE ALL ON FUNCTION public._account_country(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.account_country(_user_id uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
SELECT CASE WHEN auth.uid() IS NOT NULL AND (_user_id = auth.uid() OR public.has_role(auth.uid(),'admin')) THEN public._account_country(_user_id) END; $$;

CREATE OR REPLACE FUNCTION public.same_community(_a uuid, _b uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
SELECT auth.uid() IS NOT NULL AND (auth.uid() IN (_a,_b) OR public.has_role(auth.uid(),'admin')) AND (COALESCE(public._account_country(_a)=public._account_country(_b),false) OR public.has_role(_a,'admin') OR public.has_role(_b,'admin')); $$;

CREATE OR REPLACE FUNCTION public.can_supervise_dispute(_user_id uuid, _order_id uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL OR _user_id IS DISTINCT FROM auth.uid() THEN RETURN false; END IF;
  RETURN public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.staff_assignments s JOIN public.orders o ON o.id=_order_id WHERE s.user_id=auth.uid() AND s.responsibility='disputes' AND s.country IS NOT NULL AND s.country=public._account_country(o.seller_id));
END; $$;

CREATE OR REPLACE FUNCTION public.is_dispute_conversation(_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.conversations c JOIN public.orders o ON o.listing_id=c.listing_id AND o.buyer_id=c.buyer_id AND o.seller_id=c.seller_id JOIN public.disputes d ON d.order_id=o.id
 WHERE c.id=_id AND (auth.uid() IN (c.buyer_id,c.seller_id) OR public.can_supervise_dispute(auth.uid(), o.id))); $$;

CREATE OR REPLACE FUNCTION public.is_closed_dispute_conversation(_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
SELECT EXISTS(SELECT 1 FROM public.conversations c JOIN public.orders o ON o.listing_id=c.listing_id AND o.buyer_id=c.buyer_id AND o.seller_id=c.seller_id JOIN public.disputes d ON d.order_id=o.id
 WHERE c.id=_id AND d.status='resolved' AND (auth.uid() IN (c.buyer_id,c.seller_id) OR public.can_supervise_dispute(auth.uid(), o.id)))
 AND NOT EXISTS(SELECT 1 FROM public.conversations c JOIN public.orders o ON o.listing_id=c.listing_id AND o.buyer_id=c.buyer_id AND o.seller_id=c.seller_id JOIN public.disputes d ON d.order_id=o.id WHERE c.id=_id AND d.status='open'); $$;
REVOKE ALL ON FUNCTION public.is_closed_dispute_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_closed_dispute_conversation(uuid) TO authenticated;

DROP POLICY IF EXISTS msg_closed_dispute_lock ON public.messages;
CREATE POLICY msg_closed_dispute_lock ON public.messages AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_closed_dispute_conversation(conversation_id));

CREATE OR REPLACE FUNCTION public.resolve_staff_dispute(_order_id uuid, _refund boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE o public.orders%ROWTYPE; cid uuid;
BEGIN
 IF NOT public.can_supervise_dispute(auth.uid(),_order_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 SELECT * INTO o FROM public.orders WHERE id=_order_id FOR UPDATE;
 IF NOT FOUND OR o.status<>'disputed' OR NOT EXISTS(SELECT 1 FROM public.disputes WHERE order_id=o.id AND status='open') THEN RAISE EXCEPTION 'OPEN_DISPUTE_REQUIRED'; END IF;
 UPDATE public.wallets SET held=held-o.amount,balance=balance+CASE WHEN _refund THEN o.amount ELSE 0 END,updated_at=now() WHERE user_id=o.buyer_id AND held>=o.amount;
 IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_ESCROW'; END IF;
 IF _refund THEN
  INSERT INTO public.wallet_transactions(user_id,type,amount,reference) VALUES(o.buyer_id,'escrow_refund',o.amount,o.id::text);
  UPDATE public.orders SET status='refunded',updated_at=now() WHERE id=o.id;
  UPDATE public.listings SET status='active' WHERE id=o.listing_id;
 ELSE
  UPDATE public.wallets SET balance=balance+o.amount-o.fee,updated_at=now() WHERE user_id=o.seller_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'SELLER_WALLET_MISSING'; END IF;
  INSERT INTO public.wallet_transactions(user_id,type,amount,reference) VALUES(o.seller_id,'escrow_release',o.amount-o.fee,o.id::text),(o.seller_id,'fee',-o.fee,o.id::text);
  UPDATE public.orders SET status='completed',updated_at=now() WHERE id=o.id;
  UPDATE public.profiles SET sales_count=sales_count+1 WHERE id=o.seller_id;
 END IF;
 SELECT id INTO cid FROM public.conversations WHERE listing_id=o.listing_id AND buyer_id=o.buyer_id AND seller_id=o.seller_id LIMIT 1;
 IF cid IS NOT NULL THEN
  INSERT INTO public.messages(conversation_id,sender_id,body) VALUES(cid,auth.uid(),
   CASE WHEN _refund THEN '🔒 تم حسم النزاع: استرجاع المبلغ للمشتري. أُغلقت المحادثة من قبل الإدارة. / Dispute resolved: refunded to buyer. Chat closed.'
   ELSE '🔒 تم حسم النزاع: تحرير المبلغ للبائع. أُغلقت المحادثة من قبل الإدارة. / Dispute resolved: released to seller. Chat closed.' END);
 END IF;
 UPDATE public.disputes SET status='resolved',resolution=CASE WHEN _refund THEN 'استرجاع المبلغ للمشتري' ELSE 'تحرير المبلغ للبائع' END WHERE order_id=o.id AND status='open';
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_verified_seller(_user_id uuid, _verified boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'غير مصرح'; END IF;
 UPDATE public.profiles SET is_verified_seller=_verified WHERE id=_user_id;
 IF NOT _verified THEN UPDATE public.listings SET status='paused' WHERE seller_id=_user_id AND status='active'; END IF;
END; $$;