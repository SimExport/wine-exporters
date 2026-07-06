ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS brevo_campaign_id bigint;
CREATE INDEX IF NOT EXISTS campaigns_brevo_campaign_id_idx ON public.campaigns(brevo_campaign_id);