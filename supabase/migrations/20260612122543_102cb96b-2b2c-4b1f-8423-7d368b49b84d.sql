
-- 1. tender_agents
CREATE TABLE public.tender_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tender_agents TO authenticated;
GRANT ALL ON public.tender_agents TO service_role;
ALTER TABLE public.tender_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read agents" ON public.tender_agents
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage agents" ON public.tender_agents
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_tender_agents_updated_at BEFORE UPDATE ON public.tender_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. importer_requests
CREATE TABLE public.importer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  company_name text NOT NULL,
  country text,
  email text NOT NULL,
  phone text,
  wine_styles text,
  origins text,
  volume text,
  requirements text,
  status text NOT NULL DEFAULT 'published',
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.importer_requests TO authenticated;
GRANT ALL ON public.importer_requests TO service_role;
ALTER TABLE public.importer_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read published importer_requests" ON public.importer_requests
  FOR SELECT TO authenticated USING (status = 'published' OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage importer_requests" ON public.importer_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. tender_requests
CREATE TABLE public.tender_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL,
  market text NOT NULL,
  category text,
  designation_origin text,
  price text,
  available_volume text,
  vintage text,
  deadline_answer date,
  deadline_sample date,
  style_profile text,
  requirements text,
  agent_id uuid REFERENCES public.tender_agents(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tender_requests TO authenticated;
GRANT ALL ON public.tender_requests TO service_role;
ALTER TABLE public.tender_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read published tender_requests" ON public.tender_requests
  FOR SELECT TO authenticated USING (status = 'published' OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage tender_requests" ON public.tender_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. leads adjustments for CRM opportunity entries
ALTER TABLE public.leads ALTER COLUMN campaign_id DROP NOT NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'campaign';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source_ref uuid;
CREATE INDEX IF NOT EXISTS idx_leads_source_ref ON public.leads(source_ref);

-- 5. Seed: agent + sample tender
INSERT INTO public.tender_agents (name, company, email, phone, address)
VALUES (
  'Rebecka Sjons Hedlund',
  'Wineability AB',
  'rebecka@wineability.se',
  '+46723879591',
  'Gyllenstiernsgatan 8, 11526 Stockholm (Entrance code 3689F)'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.tender_requests (
  reference, market, category, designation_origin, price, available_volume,
  vintage, deadline_answer, deadline_sample, style_profile, requirements,
  agent_id, status
)
SELECT
  '657-190',
  'Systembolaget (Suède)',
  'Vin rouge',
  'AOP Beaujolais-Villages',
  '3,83 € EXW',
  '24 000 unités',
  '2026',
  '2026-10-11'::date,
  '2026-10-14'::date,
  'Vin rouge frais, fruité, typé cépage et origine, sans note boisée. Mention ''Nouveau'' obligatoire sur l''étiquette avant.',
  'Un seul produit par producteur. Photo couleur de la bouteille (hauteur min 1500px) à soumettre avant le 2026-10-30.',
  (SELECT id FROM public.tender_agents WHERE email = 'rebecka@wineability.se'),
  'published'
WHERE NOT EXISTS (SELECT 1 FROM public.tender_requests WHERE reference = '657-190');
