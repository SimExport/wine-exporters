CREATE TABLE public.campaign_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  campaign_name text NOT NULL,
  file_url text NOT NULL,
  file_name text,
  file_size integer,
  file_format text,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_reports TO authenticated;
GRANT ALL ON public.campaign_reports TO service_role;

ALTER TABLE public.campaign_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaign reports"
  ON public.campaign_reports
  FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert campaign reports"
  ON public.campaign_reports
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update campaign reports"
  ON public.campaign_reports
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete campaign reports"
  ON public.campaign_reports
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_campaign_reports_user_id ON public.campaign_reports(user_id, created_at DESC);