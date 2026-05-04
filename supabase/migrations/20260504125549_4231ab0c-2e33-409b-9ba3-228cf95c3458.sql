ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS open_to_other_markets boolean NOT NULL DEFAULT false;