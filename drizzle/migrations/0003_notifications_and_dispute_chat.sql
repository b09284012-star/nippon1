CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notif_own_read ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY notif_own_update ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY notif_own_delete ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE OR REPLACE FUNCTION public.admin_send_notification(_user_id uuid, _title text, _body text, _link text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF length(trim(coalesce(_title,''))) = 0 THEN RAISE EXCEPTION 'TITLE_REQUIRED'; END IF;
  IF _user_id IS NULL THEN
    INSERT INTO public.notifications(user_id, title, body, link)
    SELECT p.id, left(_title,120), left(coalesce(_body,''),1000), _link FROM public.profiles p;
  ELSE
    INSERT INTO public.notifications(user_id, title, body, link)
    VALUES (_user_id, left(_title,120), left(coalesce(_body,''),1000), _link);
  END IF;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.admin_send_notification(uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_send_notification(uuid,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; sender_name text;
BEGIN
  SELECT * INTO c FROM public.conversations WHERE id = NEW.conversation_id;
  SELECT display_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  IF public.has_role(NEW.sender_id, 'admin') AND NEW.sender_id <> c.buyer_id AND NEW.sender_id <> c.seller_id THEN
    sender_name := 'الإدارة';
  END IF;
  INSERT INTO public.notifications(user_id, title, body, link)
  SELECT u, 'رسالة جديدة من ' || coalesce(sender_name,'مستخدم'), left(NEW.body,140), '/chat/' || NEW.conversation_id
  FROM unnest(ARRAY[c.buyer_id, c.seller_id]) u WHERE u <> NEW.sender_id;
  UPDATE public.conversations SET last_message_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_new_message() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER messages_notify AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

CREATE POLICY conv_admin_read ON public.conversations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY msg_admin_read ON public.messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY msg_admin_insert ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_dispute_conversation(_order_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o record; cid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF o IS NULL THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  SELECT id INTO cid FROM public.conversations
   WHERE listing_id = o.listing_id AND buyer_id = o.buyer_id AND seller_id = o.seller_id LIMIT 1;
  IF cid IS NULL THEN
    INSERT INTO public.conversations(listing_id, buyer_id, seller_id) VALUES (o.listing_id, o.buyer_id, o.seller_id) RETURNING id INTO cid;
  END IF;
  RETURN cid;
END $$;
REVOKE ALL ON FUNCTION public.admin_dispute_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dispute_conversation(uuid) TO authenticated;