ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_markets_count_check;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_markets_count_check
  CHECK (array_length(target_markets, 1) >= 1 AND array_length(target_markets, 1) <= 15);