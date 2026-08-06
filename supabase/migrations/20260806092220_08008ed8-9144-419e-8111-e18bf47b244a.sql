ALTER TABLE public.campaign_interested_contacts
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'form';