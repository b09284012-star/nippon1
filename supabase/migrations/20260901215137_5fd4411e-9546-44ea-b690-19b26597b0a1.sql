CREATE POLICY "listing_images_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'listing-images');
CREATE POLICY "listing_images_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'listing-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "listing_images_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'listing-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "kyc_docs_read" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'kyc-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin'))
);
CREATE POLICY "kyc_docs_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text
);