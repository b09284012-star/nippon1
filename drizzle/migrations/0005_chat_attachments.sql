ALTER TABLE public.messages ADD COLUMN attachment_path text, ADD COLUMN attachment_name text, ADD COLUMN attachment_type text;
CREATE POLICY chat_files_read ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'chat-files' AND (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.conversations c WHERE c.id::text = (storage.foldername(name))[1] AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid()))));
CREATE POLICY chat_files_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'chat-files' AND (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.conversations c WHERE c.id::text = (storage.foldername(name))[1] AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid()))));