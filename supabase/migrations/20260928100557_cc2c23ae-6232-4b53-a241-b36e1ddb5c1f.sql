CREATE TABLE public.seo_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  seo_title text,
  slug text NOT NULL UNIQUE,
  language text NOT NULL DEFAULT 'fr',
  content_type text NOT NULL DEFAULT 'guide',
  excerpt text,
  content text NOT NULL DEFAULT '',
  category text,
  country text,
  featured_image text,
  og_image text,
  author text DEFAULT 'WineExporters',
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  meta_title text,
  meta_description text,
  focus_keyword text,
  canonical_url text,
  is_featured boolean NOT NULL DEFAULT false,
  reading_time integer,
  cta_type text DEFAULT 'market_analysis',
  related_article_ids uuid[] NOT NULL DEFAULT '{}',
  faq jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seo_articles_status_chk CHECK (status IN ('draft','published')),
  CONSTRAINT seo_articles_slug_chk CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
GRANT SELECT ON public.seo_articles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_articles TO authenticated;
GRANT ALL ON public.seo_articles TO service_role;
ALTER TABLE public.seo_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads published articles" ON public.seo_articles FOR SELECT TO anon, authenticated
  USING (status = 'published' AND published_at IS NOT NULL AND published_at <= now());
CREATE POLICY "Admins read all articles" ON public.seo_articles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins insert articles" ON public.seo_articles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update articles" ON public.seo_articles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete articles" ON public.seo_articles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX seo_articles_status_published_idx ON public.seo_articles (status, published_at DESC);
CREATE TRIGGER update_seo_articles_updated_at BEFORE UPDATE ON public.seo_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();