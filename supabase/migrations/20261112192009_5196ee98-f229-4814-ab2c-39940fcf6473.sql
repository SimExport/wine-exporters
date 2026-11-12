CREATE TABLE public.directory_country_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  language text NOT NULL DEFAULT 'fr',
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  h1 text NOT NULL,
  intro text NOT NULL,
  market_overview text NOT NULL,
  demand_notes text,
  importer_types text,
  how_to_approach text,
  meta_title text,
  meta_description text,
  key_figures jsonb NOT NULL DEFAULT '[]'::jsonb,
  faq jsonb NOT NULL DEFAULT '[]'::jsonb,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_article_slugs text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT directory_country_guides_status_chk
    CHECK (status IN ('draft', 'published')),
  CONSTRAINT directory_country_guides_lang_chk
    CHECK (language IN ('fr', 'en')),
  CONSTRAINT directory_country_guides_country_chk
    CHECK (country_code IN ('US', 'UK', 'DE', 'BE', 'JP', 'CA')),
  CONSTRAINT directory_country_guides_unique
    UNIQUE (country_code, language)
);

GRANT SELECT ON public.directory_country_guides TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.directory_country_guides TO authenticated;
GRANT ALL ON public.directory_country_guides TO service_role;

ALTER TABLE public.directory_country_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads published country guides"
  ON public.directory_country_guides
  FOR SELECT TO anon, authenticated
  USING (status = 'published' AND published_at IS NOT NULL AND published_at <= now());

CREATE POLICY "Admins read all country guides"
  ON public.directory_country_guides
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert country guides"
  ON public.directory_country_guides
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update country guides"
  ON public.directory_country_guides
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete country guides"
  ON public.directory_country_guides
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX directory_country_guides_published_idx
  ON public.directory_country_guides (status, published_at DESC);

CREATE TRIGGER update_directory_country_guides_updated_at
  BEFORE UPDATE ON public.directory_country_guides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.directory_country_guides IS
  'Editorial market guides for public /annuaire/{pays} pages. Not a contact database.';