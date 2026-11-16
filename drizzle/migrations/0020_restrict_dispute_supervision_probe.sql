CREATE OR REPLACE FUNCTION public.can_supervise_dispute(_user_id uuid, _order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Reject impersonation before reading roles, assignments, or order countries.
  IF auth.uid() IS NULL OR _user_id IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;
  RETURN public.has_role(auth.uid(), 'admin') OR EXISTS (
    SELECT 1
    FROM public.staff_assignments s
    JOIN public.orders o ON o.id = _order_id
    WHERE s.user_id = auth.uid()
      AND s.responsibility = 'disputes'
      AND s.country IS NOT NULL
      AND s.country = public.account_country(o.seller_id)
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.can_supervise_dispute(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_supervise_dispute(uuid, uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.can_supervise_dispute(uuid, uuid) IS 'Checks only the authenticated caller supervision rights; other user IDs and unauthenticated calls cannot disclose staff assignments.';