CREATE TABLE public.campaign_interested_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  email text,
  contact_name text,
  country text,
  score integer,
  description text,
  recommended_actions text,
  added_to_crm_by uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.campaign_interested_contacts TO authenticated;
GRANT ALL ON public.campaign_interested_contacts TO service_role;

ALTER TABLE public.campaign_interested_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all interested contacts"
ON public.campaign_interested_contacts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Campaign owner can view interested contacts"
ON public.campaign_interested_contacts
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.campaigns c
  WHERE c.id = campaign_id AND c.user_id = auth.uid()
));

CREATE POLICY "Campaign owner can update interested contacts"
ON public.campaign_interested_contacts
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.campaigns c
  WHERE c.id = campaign_id AND c.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.campaigns c
  WHERE c.id = campaign_id AND c.user_id = auth.uid()
));

CREATE INDEX idx_cic_campaign_id ON public.campaign_interested_contacts(campaign_id);

CREATE TRIGGER trg_cic_updated_at
BEFORE UPDATE ON public.campaign_interested_contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();