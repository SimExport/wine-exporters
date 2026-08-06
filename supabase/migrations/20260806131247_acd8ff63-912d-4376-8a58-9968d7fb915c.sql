CREATE TABLE public.brochure_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  domain_name text NOT NULL,
  email text NOT NULL,
  phone text,
  locale text NOT NULL DEFAULT 'fr',
  source text NOT NULL DEFAULT 'emelia',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.brochure_leads TO service_role;

ALTER TABLE public.brochure_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view brochure leads"
ON public.brochure_leads FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT ON public.brochure_leads TO authenticated;