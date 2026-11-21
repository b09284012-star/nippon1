CREATE OR REPLACE FUNCTION public.admin_list_orders()
RETURNS TABLE(id uuid, listing_title text, buyer_id uuid, buyer_name text, buyer_email text, seller_id uuid, seller_name text, seller_email text, amount numeric, fee numeric, quantity integer, status order_status, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT o.id, l.title, o.buyer_id, bp.display_name, bu.email::text, o.seller_id, sp.display_name, su.email::text, o.amount, o.fee, o.quantity, o.status, o.created_at
  FROM public.orders o
  LEFT JOIN public.listings l ON l.id = o.listing_id
  LEFT JOIN public.profiles bp ON bp.id = o.buyer_id
  LEFT JOIN public.profiles sp ON sp.id = o.seller_id
  LEFT JOIN auth.users bu ON bu.id = o.buyer_id
  LEFT JOIN auth.users su ON su.id = o.seller_id
  ORDER BY o.created_at DESC;
END $$;
REVOKE ALL ON FUNCTION public.admin_list_orders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_orders() TO authenticated;