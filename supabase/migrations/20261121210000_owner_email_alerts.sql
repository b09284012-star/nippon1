CREATE OR REPLACE FUNCTION public.owner_alert(_title text, _body text, _link text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner uuid;
BEGIN
  SELECT id INTO _owner FROM auth.users WHERE lower(email) = 'b09284012@gmail.com' LIMIT 1;
  IF _owner IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, link) VALUES (_owner, _title, _body, _link);
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.owner_alert(text,text,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_owner_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text; _nick text;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = NEW.user_id;
  SELECT display_name INTO _nick FROM public.profiles WHERE id = NEW.user_id;
  PERFORM public.owner_alert('مستخدم جديد سجّل في نيبون',
    'الاسم: ' || coalesce(nullif(NEW.full_name,''),'-') || E'\nالاسم المستعار: ' || coalesce(_nick,'-') ||
    E'\nالبريد: ' || coalesce(_email,'-') || E'\nالهاتف: ' || coalesce(nullif(NEW.phone,''),'-') ||
    E'\nالدولة: ' || coalesce(NEW.country,'-') || E'\nالمدينة: ' || coalesce(NEW.city,'-') ||
    E'\nالعنوان: ' || coalesce(nullif(NEW.address,''),'-') || E'\nالمعرف: ' || NEW.user_id::text,
    '/admin');
  RETURN NEW;
EXCEPTION WHEN others THEN RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS owner_new_user ON public.user_private_info;
CREATE TRIGGER owner_new_user AFTER INSERT ON public.user_private_info FOR EACH ROW EXECUTE FUNCTION public.trg_owner_new_user();

CREATE OR REPLACE FUNCTION public.trg_owner_withdrawal() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = NEW.user_id;
  PERFORM public.owner_alert('طلب سحب جديد بمبلغ ' || NEW.amount::text || ' $',
    'المستخدم: ' || coalesce(_email,'-') || E'\nالمبلغ: ' || NEW.amount::text || ' $' ||
    E'\nالشبكة: ' || coalesce(NEW.network::text,'-') || E'\nعنوان المحفظة: ' || coalesce(NEW.address,'-') ||
    E'\nالمعرف: ' || NEW.user_id::text, '/admin');
  RETURN NEW;
EXCEPTION WHEN others THEN RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS owner_withdrawal ON public.withdrawals;
CREATE TRIGGER owner_withdrawal AFTER INSERT ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.trg_owner_withdrawal();

CREATE OR REPLACE FUNCTION public.trg_owner_dispute() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = NEW.opened_by;
  PERFORM public.owner_alert('نزاع جديد على طلب',
    'فتحه: ' || coalesce(_email,'-') || E'\nالسبب: ' || coalesce(NEW.reason,'-') ||
    E'\nرقم الطلب: ' || NEW.order_id::text, '/admin');
  RETURN NEW;
EXCEPTION WHEN others THEN RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS owner_dispute ON public.disputes;
CREATE TRIGGER owner_dispute AFTER INSERT ON public.disputes FOR EACH ROW EXECUTE FUNCTION public.trg_owner_dispute();
