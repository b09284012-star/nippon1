-- ===== ENUMS =====
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
CREATE TYPE public.kyc_status AS ENUM ('none','pending','approved','rejected');
CREATE TYPE public.listing_status AS ENUM ('active','sold','paused');
CREATE TYPE public.order_status AS ENUM ('awaiting_payment','escrow_held','shipped','completed','disputed','refunded','cancelled');
CREATE TYPE public.tx_type AS ENUM ('deposit','withdrawal','escrow_hold','escrow_release','escrow_refund','fee');

-- ===== PROFILES =====
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text NOT NULL DEFAULT 'مستخدم',
  avatar_url text,
  bio text,
  country text,
  kyc_status public.kyc_status NOT NULL DEFAULT 'none',
  rating numeric(3,2) NOT NULL DEFAULT 0,
  sales_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ===== ROLES =====
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "roles_self_read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ===== KYC =====
CREATE TABLE public.kyc_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  document_number text NOT NULL,
  country text,
  id_document_path text NOT NULL,
  selfie_path text NOT NULL,
  status public.kyc_status NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT, INSERT ON public.kyc_submissions TO authenticated;
GRANT UPDATE ON public.kyc_submissions TO authenticated;
GRANT ALL ON public.kyc_submissions TO service_role;
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kyc_own_read" ON public.kyc_submissions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "kyc_own_insert" ON public.kyc_submissions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "kyc_admin_update" ON public.kyc_submissions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ===== LISTINGS =====
CREATE TABLE public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  title text NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  algorithm text,
  hashrate text NOT NULL,
  power_watts int NOT NULL,
  condition text NOT NULL,
  price_usd numeric(12,2) NOT NULL CHECK (price_usd > 0),
  warranty_months int NOT NULL CHECK (warranty_months >= 0),
  hours_used int,
  location text,
  description text NOT NULL,
  images text[] NOT NULL DEFAULT '{}',
  status public.listing_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT SELECT ON public.listings TO anon;
GRANT ALL ON public.listings TO service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "listings_public_read" ON public.listings FOR SELECT USING (true);
CREATE POLICY "listings_seller_insert" ON public.listings FOR INSERT TO authenticated
  WITH CHECK (seller_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.kyc_status = 'approved'));
CREATE POLICY "listings_seller_update" ON public.listings FOR UPDATE TO authenticated USING (seller_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (seller_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "listings_seller_delete" ON public.listings FOR DELETE TO authenticated USING (seller_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ===== WALLETS =====
CREATE TABLE public.wallets (
  user_id uuid PRIMARY KEY,
  balance numeric(14,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  held numeric(14,2) NOT NULL DEFAULT 0 CHECK (held >= 0),
  currency text NOT NULL DEFAULT 'USDT',
  deposit_address text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallets_own_read" ON public.wallets FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type public.tx_type NOT NULL,
  amount numeric(14,2) NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tx_own_read" ON public.wallet_transactions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ===== ORDERS =====
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  amount numeric(14,2) NOT NULL,
  fee numeric(14,2) NOT NULL DEFAULT 0,
  status public.order_status NOT NULL DEFAULT 'escrow_held',
  shipping_carrier text,
  tracking_number text,
  shipping_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_party_read" ON public.orders FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ===== DISPUTES =====
CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  opened_by uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.disputes TO authenticated;
GRANT ALL ON public.disputes TO service_role;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "disputes_party_read" ON public.disputes FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid()))
);

-- ===== CHAT =====
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, buyer_id)
);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv_party_read" ON public.conversations FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR seller_id = auth.uid());
CREATE POLICY "conv_buyer_insert" ON public.conversations FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid() AND seller_id <> auth.uid());
CREATE POLICY "conv_party_update" ON public.conversations FOR UPDATE TO authenticated USING (buyer_id = auth.uid() OR seller_id = auth.uid()) WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_party_read" ON public.messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid()))
);
CREATE POLICY "msg_party_insert" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid()))
);

-- ===== REVIEWS =====
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, reviewer_id)
);
GRANT SELECT, INSERT ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_public_read" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_buyer_insert" ON public.reviews FOR INSERT TO authenticated WITH CHECK (
  reviewer_id = auth.uid() AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.buyer_id = auth.uid() AND o.status = 'completed')
);

-- ===== NEW USER TRIGGER =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.wallets (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== ESCROW FUNCTIONS =====
CREATE OR REPLACE FUNCTION public.create_escrow_order(_listing_id uuid, _shipping_address text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _l public.listings%ROWTYPE; _uid uuid := auth.uid(); _fee numeric; _order uuid; _bal numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  SELECT * INTO _l FROM public.listings WHERE id = _listing_id FOR UPDATE;
  IF NOT FOUND OR _l.status <> 'active' THEN RAISE EXCEPTION 'العرض غير متاح'; END IF;
  IF _l.seller_id = _uid THEN RAISE EXCEPTION 'لا يمكنك شراء عرضك'; END IF;
  SELECT balance INTO _bal FROM public.wallets WHERE user_id = _uid FOR UPDATE;
  IF _bal IS NULL OR _bal < _l.price_usd THEN RAISE EXCEPTION 'الرصيد غير كافٍ'; END IF;
  _fee := round(_l.price_usd * 0.025, 2);
  UPDATE public.wallets SET balance = balance - _l.price_usd, held = held + _l.price_usd, updated_at = now() WHERE user_id = _uid;
  INSERT INTO public.orders (listing_id, buyer_id, seller_id, amount, fee, status, shipping_address)
  VALUES (_listing_id, _uid, _l.seller_id, _l.price_usd, _fee, 'escrow_held', _shipping_address) RETURNING id INTO _order;
  INSERT INTO public.wallet_transactions (user_id, type, amount, reference) VALUES (_uid, 'escrow_hold', -_l.price_usd, _order::text);
  UPDATE public.listings SET status = 'sold' WHERE id = _listing_id;
  RETURN _order;
END; $$;

CREATE OR REPLACE FUNCTION public.mark_order_shipped(_order_id uuid, _carrier text, _tracking text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.orders SET status = 'shipped', shipping_carrier = _carrier, tracking_number = _tracking, updated_at = now()
  WHERE id = _order_id AND seller_id = auth.uid() AND status = 'escrow_held';
  IF NOT FOUND THEN RAISE EXCEPTION 'تعذر تحديث الطلب'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.release_escrow(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o public.orders%ROWTYPE; _uid uuid := auth.uid(); _net numeric;
BEGIN
  SELECT * INTO _o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'الطلب غير موجود'; END IF;
  IF NOT (_o.buyer_id = _uid OR public.has_role(_uid,'admin')) THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  IF _o.status NOT IN ('escrow_held','shipped','disputed') THEN RAISE EXCEPTION 'حالة الطلب لا تسمح'; END IF;
  _net := _o.amount - _o.fee;
  UPDATE public.wallets SET held = held - _o.amount, updated_at = now() WHERE user_id = _o.buyer_id;
  UPDATE public.wallets SET balance = balance + _net, updated_at = now() WHERE user_id = _o.seller_id;
  INSERT INTO public.wallet_transactions (user_id, type, amount, reference) VALUES
    (_o.seller_id, 'escrow_release', _net, _order_id::text),
    (_o.seller_id, 'fee', -_o.fee, _order_id::text);
  UPDATE public.orders SET status = 'completed', updated_at = now() WHERE id = _order_id;
  UPDATE public.disputes SET status = 'resolved', resolution = 'تحرير المبلغ للبائع' WHERE order_id = _order_id AND status = 'open';
  UPDATE public.profiles SET sales_count = sales_count + 1 WHERE id = _o.seller_id;
END; $$;

CREATE OR REPLACE FUNCTION public.refund_escrow(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o public.orders%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  SELECT * INTO _o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND OR _o.status IN ('completed','refunded') THEN RAISE EXCEPTION 'حالة الطلب لا تسمح'; END IF;
  UPDATE public.wallets SET held = held - _o.amount, balance = balance + _o.amount, updated_at = now() WHERE user_id = _o.buyer_id;
  INSERT INTO public.wallet_transactions (user_id, type, amount, reference) VALUES (_o.buyer_id, 'escrow_refund', _o.amount, _order_id::text);
  UPDATE public.orders SET status = 'refunded', updated_at = now() WHERE id = _order_id;
  UPDATE public.listings SET status = 'active' WHERE id = _o.listing_id;
  UPDATE public.disputes SET status = 'resolved', resolution = 'استرجاع المبلغ للمشتري' WHERE order_id = _order_id AND status = 'open';
END; $$;

CREATE OR REPLACE FUNCTION public.open_dispute(_order_id uuid, _reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o public.orders%ROWTYPE; _id uuid;
BEGIN
  SELECT * INTO _o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND OR (auth.uid() NOT IN (_o.buyer_id, _o.seller_id)) THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  INSERT INTO public.disputes (order_id, opened_by, reason) VALUES (_order_id, auth.uid(), _reason) RETURNING id INTO _id;
  UPDATE public.orders SET status = 'disputed', updated_at = now() WHERE id = _order_id;
  RETURN _id;
END; $$;

-- ===== REALTIME =====
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ===== DEMO DATA =====
INSERT INTO public.profiles (id, display_name, country, kyc_status, rating, sales_count) VALUES
  ('11111111-1111-4111-8111-111111111111','مزرعة الشرق للتعدين','الإمارات','approved',4.80,37),
  ('22222222-2222-4222-8222-222222222222','هاش تك','مصر','approved',4.60,21),
  ('33333333-3333-4333-8333-333333333333','نيبون ستور','ليبيا','approved',4.90,54);

INSERT INTO public.listings (seller_id, title, brand, model, algorithm, hashrate, power_watts, condition, price_usd, warranty_months, hours_used, location, description, images) VALUES
  ('11111111-1111-4111-8111-111111111111','Antminer S19 Pro 110TH مستعمل','Bitmain','Antminer S19 Pro','SHA-256','110 TH/s',3250,'ممتاز',1450.00,3,9800,'دبي','جهاز تعدين بيتكوين مفحوص بالكامل، مراوح جديدة، يعمل بكفاءة 100% مع كامل الملحقات.','{}'),
  ('22222222-2222-4222-8222-222222222222','Whatsminer M30S++ 112TH','MicroBT','Whatsminer M30S++','SHA-256','112 TH/s',3472,'جيد جداً',1290.00,2,14500,'القاهرة','تم تنظيفه وتغيير المعجون الحراري، درجة حرارة مستقرة، مناسب للمزارع.','{}'),
  ('33333333-3333-4333-8333-333333333333','Antminer L7 9.5GH لايتكوين','Bitmain','Antminer L7','Scrypt','9.5 GH/s',3425,'ممتاز',3900.00,6,4200,'طرابلس','جهاز تعدين لايتكوين/دوجكوين، استخدام خفيف جداً، ضمان 6 أشهر من المتجر.','{}'),
  ('11111111-1111-4111-8111-111111111111','iPollo V1 Mini لتعدين الإيثريوم كلاسيك','iPollo','V1 Mini','Etchash','300 MH/s',240,'جيد',420.00,1,22000,'أبوظبي','جهاز منزلي هادئ وقليل الاستهلاك، مثالي للمبتدئين.','{}'),
  ('22222222-2222-4222-8222-222222222222','Goldshell KA Box Pro','Goldshell','KA Box Pro','Kadena','1.6 TH/s',400,'ممتاز',680.00,3,3000,'الإسكندرية','حجم صغير وضجيج منخفض، مناسب للاستخدام المنزلي مع باور سبلاي أصلي.','{}'),
  ('33333333-3333-4333-8333-333333333333','Antminer S21 200TH نصف مستعمل','Bitmain','Antminer S21','SHA-256','200 TH/s',3500,'كالجديد',5200.00,12,1200,'طرابلس','أحدث جيل، كفاءة 17.5 جول/تيرا، ضمان سنة كاملة من نيبون.','{}');