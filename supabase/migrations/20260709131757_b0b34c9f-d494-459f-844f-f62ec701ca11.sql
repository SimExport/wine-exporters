CREATE TABLE public.opportunity_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  opportunity_type text NOT NULL CHECK (opportunity_type IN ('importer','tender')),
  opportunity_id uuid NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, opportunity_type, opportunity_id)
);

CREATE INDEX idx_opportunity_views_user ON public.opportunity_views(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_views TO authenticated;
GRANT ALL ON public.opportunity_views TO service_role;

ALTER TABLE public.opportunity_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own opportunity views"
  ON public.opportunity_views FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own opportunity views"
  ON public.opportunity_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);