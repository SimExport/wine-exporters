CREATE TABLE public.prospect_market_searches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  winery_name text,
  contact_name text,
  email text,
  website text,
  winery_location text,
  wine_types text[],
  appellations_cuvees text,
  export_price_range text,
  certifications text[],
  target_country text,
  importer_preferences text[],
  exclusions text,
  additional_context text,
  status text NOT NULL DEFAULT 'new',
  source text,
  campaign text,
  referrer text
);

GRANT INSERT ON public.prospect_market_searches TO anon;
GRANT INSERT ON public.prospect_market_searches TO authenticated;
GRANT ALL ON public.prospect_market_searches TO service_role;

ALTER TABLE public.prospect_market_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a market analysis request"
  ON public.prospect_market_searches
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);