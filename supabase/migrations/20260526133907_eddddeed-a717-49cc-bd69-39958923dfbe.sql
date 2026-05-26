
CREATE TABLE public.campaign_email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid,
  event_type text NOT NULL,
  recipient text NOT NULL,
  bcc text,
  subject text,
  status text NOT NULL,
  error_message text,
  resend_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_email_logs_campaign_id ON public.campaign_email_logs(campaign_id);
CREATE INDEX idx_campaign_email_logs_created_at ON public.campaign_email_logs(created_at DESC);

GRANT SELECT ON public.campaign_email_logs TO authenticated;
GRANT ALL ON public.campaign_email_logs TO service_role;

ALTER TABLE public.campaign_email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email logs"
  ON public.campaign_email_logs
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
