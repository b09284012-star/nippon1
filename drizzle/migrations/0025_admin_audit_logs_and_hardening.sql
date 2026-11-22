CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL CHECK (action IN ('ban','suspend','unban','delete')),
  admin_id uuid NOT NULL,
  admin_name text,
  admin_email text,
  target_id uuid NOT NULL,
  target_name text,
  target_email text,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_audit_logs TO authenticated;
GRANT ALL ON public.admin_audit_logs TO service_role;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read audit logs" ON public.admin_audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX admin_audit_logs_created_idx ON public.admin_audit_logs (created_at DESC);

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND (
      p.proname LIKE 'admin\_%' OR p.proname LIKE 'trg\_owner\_%' OR p.proname IN (
        'approve_deposit','approve_withdrawal','reject_deposit','reject_withdrawal','assign_staff','assign_dispute_supervisor',
        'resolve_staff_dispute','staff_disputes','lock_account_country','prepare_forum_post','credit_deposit','owner_alert',
        'review_country_change','set_deposit_address','claim_deposit_analytics'))
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.sig);
  END LOOP;
END $$;