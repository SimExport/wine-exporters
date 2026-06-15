CREATE POLICY "Admins can view all documents storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'));