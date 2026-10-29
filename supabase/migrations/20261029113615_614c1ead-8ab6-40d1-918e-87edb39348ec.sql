-- lovable-cron-fallback-reviewed: Queue-only minute drain; wake on enqueue, stop after drain, 180-hop limit.
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
 PERFORM net.http_post(url:='https://dmgafmigqfycyaopdviw.supabase.co/functions/v1/process-campaign-results',headers:=jsonb_build_object('Content-Type','application/json','x-campaign-results-secret',k),body:=jsonb_build_object('campaign_id',r.campaign_id),timeout_milliseconds:=120000);
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.campaign_result_jobs WHERE status IN ('pending','processing','retry')) THEN
 IF NOT EXISTS(SELECT 1 FROM cron.job WHERE jobname='campaign-results-drain') THEN PERFORM cron.schedule('campaign-results-drain','* * * * *','SELECT public.dispatch_campaign_results(false);'); END IF;
 ELSE
 FOR r IN SELECT jobid FROM cron.job WHERE jobname='campaign-results-drain' LOOP PERFORM cron.unschedule(r.jobid); END LOOP;
 END IF;
END; $$;
REVOKE ALL ON FUNCTION public.dispatch_campaign_results(boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_campaign_results(boolean) TO service_role;