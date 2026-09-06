-- 1) Revoke EXECUTE on internal-only SECURITY DEFINER functions from signed-in users
REVOKE EXECUTE ON FUNCTION public.credit_deposit(uuid, numeric, text) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.set_deposit_address(uuid, text, text, text) FROM authenticated, anon;

-- Keep them callable by the service role (used internally by other definer functions / backend)
GRANT EXECUTE ON FUNCTION public.credit_deposit(uuid, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_deposit_address(uuid, text, text, text) TO service_role;

-- 2) Reviews moderation policies
CREATE POLICY "reviews_owner_update" ON public.reviews
  FOR UPDATE TO authenticated
  USING (reviewer_id = auth.uid())
  WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "reviews_admin_delete" ON public.reviews
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3) Orders: allow parties to update only non-financial tracking fields is intentionally NOT granted;
-- all order updates flow through audited SECURITY DEFINER functions. No policy added by design.