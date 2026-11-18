CREATE OR REPLACE FUNCTION public.lock_account_country() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin')
     AND NULLIF(trim(OLD.country),'') IS NOT NULL THEN
    NEW.country := OLD.country;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_lock_account_country ON public.user_private_info;
CREATE TRIGGER trg_lock_account_country BEFORE UPDATE ON public.user_private_info FOR EACH ROW EXECUTE FUNCTION public.lock_account_country();

CREATE TABLE public.country_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  current_country text,
  requested_country text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT ON public.country_change_requests TO authenticated;
GRANT ALL ON public.country_change_requests TO service_role;
ALTER TABLE public.country_change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY ccr_select ON public.country_change_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE UNIQUE INDEX ccr_one_pending ON public.country_change_requests(user_id) WHERE status='pending';

CREATE OR REPLACE FUNCTION public.request_country_change(_country text, _reason text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _id uuid; _cur text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF length(trim(coalesce(_country,''))) < 2 OR length(_country) > 60 THEN RAISE EXCEPTION 'invalid country'; END IF;
  IF length(trim(coalesce(_reason,''))) < 5 OR length(_reason) > 500 THEN RAISE EXCEPTION 'invalid reason'; END IF;
  _cur := public.account_country(auth.uid());
  IF _cur IS NOT NULL AND lower(_cur) = lower(trim(_country)) THEN RAISE EXCEPTION 'same country'; END IF;
  INSERT INTO public.country_change_requests(user_id,current_country,requested_country,reason)
  VALUES (auth.uid(), _cur, trim(_country), trim(_reason)) RETURNING id INTO _id;
  RETURN _id;
END; $$;
REVOKE ALL ON FUNCTION public.request_country_change(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_country_change(text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_country_change(_id uuid, _approve boolean, _note text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r public.country_change_requests;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO r FROM public.country_change_requests WHERE id=_id AND status='pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not pending'; END IF;
  UPDATE public.country_change_requests SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
    admin_note = NULLIF(trim(coalesce(_note,'')),''), reviewed_at = now() WHERE id=_id;
  IF _approve THEN
    UPDATE public.user_private_info SET country = r.requested_country, updated_at = now() WHERE user_id = r.user_id;
    UPDATE public.profiles SET country = r.requested_country WHERE id = r.user_id;
  END IF;
  INSERT INTO public.notifications(user_id,title,body,link)
  VALUES (r.user_id,
    CASE WHEN _approve THEN 'تمت الموافقة على تغيير الدولة' ELSE 'تم رفض طلب تغيير الدولة' END,
    CASE WHEN _approve THEN 'أصبحت دولتك: ' || r.requested_country ELSE coalesce(NULLIF(trim(coalesce(_note,'')),''),'لم تتم الموافقة على الطلب') END,
    '/profile');
END; $$;
REVOKE ALL ON FUNCTION public.review_country_change(uuid,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_country_change(uuid,boolean,text) TO authenticated;