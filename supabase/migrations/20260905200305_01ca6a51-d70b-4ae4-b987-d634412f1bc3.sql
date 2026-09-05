-- 1. Lock down SECURITY DEFINER function execution
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, public;

REVOKE EXECUTE ON FUNCTION public.credit_deposit(uuid, numeric, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_deposit_address(uuid, text, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM authenticated;

GRANT EXECUTE ON FUNCTION public.credit_deposit(uuid, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_deposit_address(uuid, text, text, text) TO service_role;

-- 2. Restrict listing image reads
DROP POLICY IF EXISTS listing_images_read ON storage.objects;
CREATE POLICY listing_images_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'listing-images'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.images @> ARRAY[storage.objects.name]
        AND (
          l.status = 'active'
          OR EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.listing_id = l.id
              AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
          )
        )
    )
  )
);

-- 3. Hide KYC status from anonymous visitors
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, display_name, avatar_url, bio, country, rating, sales_count, created_at)
  ON public.profiles TO anon;