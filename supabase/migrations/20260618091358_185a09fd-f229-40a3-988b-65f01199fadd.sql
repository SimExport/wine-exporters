ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS source_score INTEGER,
  ADD COLUMN IF NOT EXISTS source_relevance TEXT;