-- lovable-cron-fallback-reviewed: Wake on daily enqueue; minute retries only while pending work remains, unschedule after drain, bounded 180 hops per campaign.
CREATE TABLE public.campaign_result_jobs (
 campaign_id uuid PRIMARY KEY REFERENCES public.campaigns(id), stage text NOT NULL DEFAULT 'sync', status text NOT NULL DEFAULT 'pending', lease_token uuid, lease_until timestamptz, next_attempt_at timestamptz NOT NULL DEFAULT now(), attempts int NOT NULL DEFAULT 0, hops int NOT NULL DEFAULT 0, last_error text, notification_state text NOT NULL DEFAULT 'pending', notification_attempted_at timestamptz, notification_sent_at timestamptz, resend_id text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.campaign_result_jobs TO authenticated;
GRANT ALL ON public.campaign_result_jobs TO service_role;
ALTER TABLE public.campaign_result_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read result jobs" ON public.campaign_result_jobs FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE TRIGGER campaign_result_jobs_updated BEFORE UPDATE ON public.campaign_result_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.claim_campaign_result_job(_id uuid) RETURNS SETOF public.campaign_result_jobs LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 UPDATE public.campaign_result_jobs j SET lease_token=gen_random_uuid(),lease_until=now()+interval '4 minutes',status='processing',attempts=attempts+1,hops=hops+1 WHERE campaign_id=_id AND status IN ('pending','processing','retry') AND hops<180 AND next_attempt_at<=now() AND (lease_until IS NULL OR lease_until<now()) RETURNING j.*;
$$;
REVOKE ALL ON FUNCTION public.claim_campaign_result_job(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_campaign_result_job(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.install_campaign_results_secret(_secret text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF length(_secret)<32 THEN RAISE EXCEPTION 'Invalid secret'; END IF;
 IF EXISTS(SELECT 1 FROM vault.secrets WHERE name='campaign_results_internal') THEN RETURN false; END IF;
 PERFORM vault.create_secret(_secret,'campaign_results_internal','Internal campaign result callbacks'); RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.install_campaign_results_secret(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.install_campaign_results_secret(text) TO service_role;
CREATE OR REPLACE FUNCTION public.dispatch_campaign_results(_daily boolean DEFAULT false) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE k text; r record;
BEGIN
 SELECT decrypted_secret INTO k FROM vault.decrypted_secrets WHERE name='campaign_results_internal';
 IF k IS NULL THEN RETURN; END IF;
 IF _daily THEN
 INSERT INTO public.campaign_result_jobs(campaign_id)
 SELECT id FROM public.campaigns WHERE status='active' AND launched_at<=now()-interval '48 hours' AND brevo_campaign_id IS NOT NULL AND NOT public.is_test_campaign(id) ON CONFLICT DO NOTHING;
 END IF;
 UPDATE public.campaign_result_jobs SET status='paused',last_error='Invocation budget exhausted; admin review required' WHERE hops>=180 AND status IN ('pending','processing','retry') AND (lease_until IS NULL OR lease_until<now());
 FOR r IN SELECT campaign_id FROM public.campaign_result_jobs WHERE status IN ('pending','processing','retry') AND next_attempt_at<=now() AND (lease_until IS NULL OR lease_until<now()) ORDER BY created_at LIMIT 5 LOOP
 PERFORM net.http_post(url:='https://dmgafmigqfycyaopdviw.supabase.co/functions/v1/process-campaign-results',headers:=jsonb_build_object('Content-Type','application/json','x-campaign-results-secret',k),body:=jsonb_build_object('campaign_id',r.campaign_id),timeout_milliseconds:=1000);
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.campaign_result_jobs WHERE status IN ('pending','processing','retry')) THEN
 IF NOT EXISTS(SELECT 1 FROM cron.job WHERE jobname='campaign-results-drain') THEN PERFORM cron.schedule('campaign-results-drain','* * * * *','SELECT public.dispatch_campaign_results(false);'); END IF;
 ELSE
 FOR r IN SELECT jobid FROM cron.job WHERE jobname='campaign-results-drain' LOOP PERFORM cron.unschedule(r.jobid); END LOOP;
 END IF;
END; $$;
REVOKE ALL ON FUNCTION public.dispatch_campaign_results(boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_campaign_results(boolean) TO service_role;