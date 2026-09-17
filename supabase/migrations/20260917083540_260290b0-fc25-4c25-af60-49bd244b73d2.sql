ALTER TABLE public.prospect_market_searches
  ADD COLUMN IF NOT EXISTS admin_notification_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_notification_error text;