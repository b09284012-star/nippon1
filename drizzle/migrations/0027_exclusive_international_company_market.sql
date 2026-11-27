CREATE TABLE public.company_settings (user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE, fee_percent numeric NOT NULL CHECK (fee_percent >= 0 AND fee_percent < 5));
GRANT SELECT ON public.company_settings TO authenticated;
GRANT ALL ON public.company_settings TO service_role;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY company_settings_owner_manager ON public.company_settings FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE FUNCTION public.can_shop_companies() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT auth.uid() IS NOT NULL AND public.community_account_active() AND (public.has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_verified_seller)); $$;
REVOKE ALL ON FUNCTION public.can_shop_companies() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_shop_companies() TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.company_directory() RETURNS TABLE(user_id uuid,company_name text,logo_path text,contact_email text,contact_phone text,website text,description text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT p.id,coalesce(nullif(c.company_name,''),p.display_name),c.logo_path,coalesce(c.contact_email,''),coalesce(c.contact_phone,''),coalesce(c.website,''),coalesce(c.description,'') FROM public.profiles p LEFT JOIN public.company_profiles c ON c.user_id=p.id WHERE public.can_shop_companies() AND p.is_company AND p.is_verified_seller ORDER BY p.display_name; $$;
CREATE OR REPLACE FUNCTION public.company_market_listings() RETURNS TABLE(id uuid,seller_id uuid,title text,brand text,model text,hashrate text,power_watts integer,condition text,price_usd numeric,warranty_months integer,location text,images text[],status text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT l.id,l.seller_id,l.title,l.brand,l.model,l.hashrate,l.power_watts,l.condition,l.price_usd,l.warranty_months,l.location,l.images,l.status::text FROM public.listings l JOIN public.profiles p ON p.id=l.seller_id JOIN public.company_settings s ON s.user_id=p.id WHERE public.can_shop_companies() AND p.is_company AND p.is_verified_seller AND l.status='active' ORDER BY l.created_at DESC; $$;
REVOKE ALL ON FUNCTION public.company_directory(),public.company_market_listings(),public.verified_company_ids() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.company_directory(),public.company_market_listings() TO authenticated,service_role;
REVOKE EXECUTE ON FUNCTION public.verified_company_ids() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.verified_company_ids() TO service_role;

CREATE FUNCTION public.can_view_company_listing(_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.listings l JOIN public.profiles p ON p.id=l.seller_id WHERE l.id=_id AND (NOT p.is_company OR l.seller_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR (p.is_verified_seller AND public.can_shop_companies()) OR EXISTS(SELECT 1 FROM public.orders o WHERE o.listing_id=l.id AND o.buyer_id=auth.uid()))); $$;
REVOKE ALL ON FUNCTION public.can_view_company_listing(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_view_company_listing(uuid) TO authenticated,service_role;
CREATE POLICY exclusive_company_listing_boundary ON public.listings AS RESTRICTIVE FOR SELECT TO authenticated USING(public.can_view_company_listing(id));
CREATE OR REPLACE FUNCTION public.is_public_inventory_image(_name text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.listings l JOIN public.profiles p ON p.id=l.seller_id WHERE l.status='active' AND NOT p.is_company AND _name=ANY(l.images)); $$;

CREATE FUNCTION public.admin_configure_company(_user_id uuid,_enabled boolean,_fee_percent numeric) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF; IF _enabled THEN IF _fee_percent IS NULL OR _fee_percent<0 OR _fee_percent>=5 THEN RAISE EXCEPTION 'COMPANY_FEE_MUST_BE_BELOW_5'; END IF; IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=_user_id AND is_verified_seller) THEN RAISE EXCEPTION 'SELLER_NOT_VERIFIED'; END IF; INSERT INTO public.company_settings(user_id,fee_percent) VALUES(_user_id,_fee_percent) ON CONFLICT(user_id) DO UPDATE SET fee_percent=EXCLUDED.fee_percent; END IF; UPDATE public.profiles SET is_company=_enabled WHERE id=_user_id; IF NOT FOUND THEN RAISE EXCEPTION 'ACCOUNT_NOT_FOUND'; END IF; END $$;
REVOKE ALL ON FUNCTION public.admin_configure_company(uuid,boolean,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_configure_company(uuid,boolean,numeric) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.admin_set_company(_user_id uuid,_company boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF; IF _company AND NOT EXISTS(SELECT 1 FROM public.company_settings s JOIN public.profiles p ON p.id=s.user_id WHERE p.id=_user_id AND p.is_verified_seller) THEN RAISE EXCEPTION 'CONFIGURE_COMPANY_FEE_FIRST'; END IF; UPDATE public.profiles SET is_company=_company WHERE id=_user_id; END $$;

CREATE OR REPLACE FUNCTION public.create_escrow_order(_listing_id uuid,_shipping_address text,_quantity integer DEFAULT 1) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _l public.listings%ROWTYPE; _uid uuid:=auth.uid(); _fee numeric; _order uuid; _bal numeric; _qty integer; _total numeric; _company boolean; _verified boolean; _rate numeric:=5;
BEGIN
 IF _uid IS NULL OR NOT public.community_account_active() THEN RAISE EXCEPTION 'غير مصرح'; END IF;
 _qty:=GREATEST(COALESCE(_quantity,1),1);
 SELECT * INTO _l FROM public.listings WHERE id=_listing_id FOR UPDATE;
 IF NOT FOUND OR _l.status<>'active' THEN RAISE EXCEPTION 'العرض غير متاح'; END IF;
 IF _l.seller_id=_uid THEN RAISE EXCEPTION 'لا يمكنك شراء عرضك'; END IF;
 SELECT is_company,is_verified_seller INTO _company,_verified FROM public.profiles WHERE id=_l.seller_id;
 IF _company THEN
   IF NOT public.can_shop_companies() THEN RAISE EXCEPTION 'VERIFIED_BUYER_REQUIRED'; END IF;
   IF NOT _verified THEN RAISE EXCEPTION 'العرض غير متاح'; END IF;
   SELECT fee_percent INTO _rate FROM public.company_settings WHERE user_id=_l.seller_id;
   IF _rate IS NULL THEN RAISE EXCEPTION 'CONFIGURE_COMPANY_FEE_FIRST'; END IF;
 END IF;
 IF _l.availability='in_stock' AND _qty>_l.quantity THEN RAISE EXCEPTION 'الكمية المطلوبة غير متوفرة'; END IF;
 _total:=_l.price_usd*_qty;
 SELECT balance INTO _bal FROM public.wallets WHERE user_id=_uid FOR UPDATE;
 IF _bal IS NULL OR _bal<_total THEN RAISE EXCEPTION 'الرصيد غير كافٍ'; END IF;
 _fee:=round(_total*_rate/100,2);
 UPDATE public.wallets SET balance=balance-_total,held=held+_total,updated_at=now() WHERE user_id=_uid;
 INSERT INTO public.orders(listing_id,buyer_id,seller_id,amount,fee,status,shipping_address,quantity) VALUES(_listing_id,_uid,_l.seller_id,_total,_fee,'escrow_held',_shipping_address,_qty) RETURNING id INTO _order;
 INSERT INTO public.wallet_transactions(user_id,type,amount,reference) VALUES(_uid,'escrow_hold',-_total,_order::text);
 IF _l.availability='in_stock' THEN UPDATE public.listings SET quantity=quantity-_qty,status=CASE WHEN quantity-_qty<=0 THEN 'sold' ELSE status END WHERE id=_listing_id; END IF;
 RETURN _order;
END $$;

ALTER TABLE public.conversations ADD COLUMN company_trade boolean NOT NULL DEFAULT false;
UPDATE public.conversations c SET company_trade=true FROM public.profiles s,public.profiles b WHERE c.seller_id=s.id AND c.buyer_id=b.id AND s.is_company AND s.is_verified_seller AND b.is_verified_seller;
CREATE FUNCTION public.prepare_company_conversation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NOT EXISTS(SELECT 1 FROM public.listings WHERE id=NEW.listing_id AND seller_id=NEW.seller_id) THEN RAISE EXCEPTION 'INVALID_LISTING_SELLER'; END IF; NEW.company_trade:=EXISTS(SELECT 1 FROM public.profiles s JOIN public.company_settings cfg ON cfg.user_id=s.id JOIN public.profiles b ON b.id=NEW.buyer_id WHERE s.id=NEW.seller_id AND s.is_company AND s.is_verified_seller AND b.is_verified_seller); IF EXISTS(SELECT 1 FROM public.profiles WHERE id=NEW.seller_id AND is_company) AND NOT NEW.company_trade AND auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'VERIFIED_BUYER_REQUIRED'; END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.prepare_company_conversation() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER prepare_company_trade BEFORE INSERT ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.prepare_company_conversation();
CREATE OR REPLACE FUNCTION public.lock_conversation_parties() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF NEW.buyer_id<>OLD.buyer_id OR NEW.seller_id<>OLD.seller_id OR NEW.listing_id<>OLD.listing_id OR NEW.company_trade IS DISTINCT FROM OLD.company_trade THEN RAISE EXCEPTION 'IMMUTABLE_CONVERSATION'; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.can_access_conversation(_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.conversations c WHERE c.id=_id AND (public.has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM public.orders o JOIN public.disputes d ON d.order_id=o.id WHERE o.listing_id=c.listing_id AND o.buyer_id=c.buyer_id AND o.seller_id=c.seller_id AND public.can_supervise_dispute(auth.uid(),o.id)) OR ((c.buyer_id=auth.uid() OR c.seller_id=auth.uid()) AND (c.company_trade OR public.same_community(c.buyer_id,c.seller_id))))); $$;
ALTER POLICY conv_country_create ON public.conversations WITH CHECK(company_trade OR public.same_community(buyer_id,seller_id));
ALTER POLICY conv_country_update ON public.conversations WITH CHECK(company_trade OR public.same_community(buyer_id,seller_id));

CREATE FUNCTION public.company_sales_orders() RETURNS TABLE(id uuid,listing_id uuid,title text,amount numeric,fee numeric,quantity integer,status text,created_at timestamptz) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NOT public.community_account_active() OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_company) THEN RAISE EXCEPTION 'COMPANY_ACCOUNT_REQUIRED'; END IF; RETURN QUERY SELECT o.id,o.listing_id,coalesce(l.title,'—'),o.amount,o.fee,o.quantity,o.status::text,o.created_at FROM public.orders o LEFT JOIN public.listings l ON l.id=o.listing_id WHERE o.seller_id=auth.uid() ORDER BY o.created_at DESC; END $$;
REVOKE ALL ON FUNCTION public.company_sales_orders() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.company_sales_orders() TO authenticated,service_role;