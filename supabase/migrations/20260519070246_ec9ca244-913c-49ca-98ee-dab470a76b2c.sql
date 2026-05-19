CREATE POLICY "Admins can update any campaign"
ON public.campaigns
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));