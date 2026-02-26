ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS remind_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS remind_note TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_remind_at ON public.leads (remind_at)
  WHERE remind_at IS NOT NULL;