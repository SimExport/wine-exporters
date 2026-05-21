DROP POLICY IF EXISTS "Paid users access buyer_contacts" ON public.buyer_contacts;
DROP POLICY IF EXISTS "Paid users and admins can view buyer contacts" ON public.buyer_contacts;

CREATE POLICY "Authenticated users can view buyer contacts"
ON public.buyer_contacts
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);