CREATE UNIQUE INDEX IF NOT EXISTS campaign_email_logs_once_per_event
  ON public.campaign_email_logs (campaign_id, event_type)
  WHERE event_type IN ('campaign_scheduled','campaign_launched') AND status <> 'failed';
DO $cron$
DECLARE _id bigint;
BEGIN
  SELECT jobid INTO _id FROM cron.job WHERE jobname = 'campaign-results-daily';
  IF _id IS NOT NULL THEN PERFORM cron.alter_job(_id, schedule := '0 12 * * *'); END IF;
END
$cron$;