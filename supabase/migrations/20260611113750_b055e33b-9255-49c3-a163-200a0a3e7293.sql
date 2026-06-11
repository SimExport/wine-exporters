
CREATE POLICY "Admins can view all documents" ON public.documents FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all media" ON public.media FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all credits" ON public.user_credits FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
