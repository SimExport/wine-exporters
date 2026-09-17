GRANT SELECT ON public.prospect_market_searches TO authenticated;

CREATE POLICY "Admins can view market analysis requests"
  ON public.prospect_market_searches
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));