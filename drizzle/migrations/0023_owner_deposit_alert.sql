CREATE OR REPLACE FUNCTION public.trg_owner_deposit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text; _user_total numeric; _all_total numeric;
BEGIN
  IF NEW.type <> 'deposit' OR NEW.status <> 'completed' THEN RETURN NEW; END IF;
  SELECT email INTO _email FROM auth.users WHERE id = NEW.user_id;
  SELECT coalesce(sum(amount),0) INTO _user_total FROM public.wallet_transactions
    WHERE user_id = NEW.user_id AND type = 'deposit' AND status = 'completed';
  SELECT coalesce(sum(amount),0) INTO _all_total FROM public.wallet_transactions
    WHERE type = 'deposit' AND status = 'completed';
  PERFORM public.owner_alert('إيداع جديد بمبلغ ' || NEW.amount::text || ' $',
    'المستخدم: ' || coalesce(_email,'-') || E'\nقيمة الإيداع: ' || NEW.amount::text || ' $' ||
    E'\nإجمالي إيداعات هذا المستخدم: ' || _user_total::text || ' $' ||
    E'\nإجمالي إيداعات الموقع كله: ' || _all_total::text || ' $' ||
    E'\nالمعرف: ' || NEW.user_id::text, '/admin');
  RETURN NEW;
EXCEPTION WHEN others THEN RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS owner_deposit ON public.wallet_transactions;
CREATE TRIGGER owner_deposit AFTER INSERT ON public.wallet_transactions FOR EACH ROW EXECUTE FUNCTION public.trg_owner_deposit();