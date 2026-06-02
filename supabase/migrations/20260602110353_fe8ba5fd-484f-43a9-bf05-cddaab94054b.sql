DROP POLICY IF EXISTS "Campaign reports are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload campaign reports" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update campaign reports" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete campaign reports" ON storage.objects;

CREATE POLICY "Campaign reports are publicly readable"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'campaign-reports');

CREATE POLICY "Admins can upload campaign reports"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'campaign-reports'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can update campaign reports"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'campaign-reports'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  bucket_id = 'campaign-reports'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can delete campaign reports"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'campaign-reports'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);