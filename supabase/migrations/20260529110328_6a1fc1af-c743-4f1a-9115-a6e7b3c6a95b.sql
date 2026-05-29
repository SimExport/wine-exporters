-- Allow admins to update any profile (needed for subscription_plan fixes from the admin UI)
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO public
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));