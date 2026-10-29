CREATE TABLE public.campaign_send_queue (
 campaign_id uuid PRIMARY KEY REFERENCES public.campaigns(id),
 approved_at timestamptz NOT NULL DEFAULT now(),
 approved_by uuid,
 state text NOT NULL DEFAULT 'queued',
 attempted_at timestamptz,
 sent_at timestamptz,
 error text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_send_queue TO authenticated;
GRANT ALL ON public.campaign_send_queue TO service_role;
ALTER TABLE public.campaign_send_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage send queue" ON public.campaign_send_queue FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE TRIGGER campaign_send_queue_updated BEFORE UPDATE ON public.campaign_send_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.approve_campaign_for_queue(_id uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.campaigns%ROWTYPE; st text;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT * INTO c FROM public.campaigns WHERE id=_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;
 IF c.status<>'pending_validation' THEN RAISE EXCEPTION 'Campaign is not pending validation'; END IF;
 IF COALESCE((c.email_content->>'version')::int,0)<>2 OR btrim(COALESCE(c.message_html,''))='' THEN RAISE EXCEPTION 'Only custom email campaigns can be scheduled'; END IF;
 IF public.is_test_campaign(_id) THEN RAISE EXCEPTION 'Test campaigns cannot be scheduled'; END IF;
 IF c.send_started_at IS NOT NULL OR c.brevo_campaign_id IS NOT NULL THEN RAISE EXCEPTION 'Campaign already sent or send in progress'; END IF;
 INSERT INTO public.campaign_send_queue(campaign_id,approved_by) VALUES(_id,auth.uid()) ON CONFLICT(campaign_id) DO NOTHING;
 SELECT state INTO st FROM public.campaign_send_queue WHERE campaign_id=_id;
 RETURN st;
END $$;
REVOKE ALL ON FUNCTION public.approve_campaign_for_queue(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.approve_campaign_for_queue(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.cancel_campaign_queue(_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 DELETE FROM public.campaign_send_queue WHERE campaign_id=_id AND state IN ('queued','failed');
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.cancel_campaign_queue(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cancel_campaign_queue(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.claim_campaign_send() RETURNS SETOF public.campaign_send_queue LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 UPDATE public.campaign_send_queue q SET state='sending',attempted_at=now(),updated_at=now()
 WHERE q.campaign_id=(SELECT campaign_id FROM public.campaign_send_queue WHERE state='queued' ORDER BY approved_at,campaign_id LIMIT 1 FOR UPDATE SKIP LOCKED) AND q.state='queued' RETURNING q.*;
$$;
REVOKE ALL ON FUNCTION public.claim_campaign_send() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_campaign_send() TO service_role;
CREATE OR REPLACE FUNCTION public.install_campaign_queue_secret(_secret text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF length(_secret)<32 THEN RAISE EXCEPTION 'Invalid secret'; END IF;
 IF EXISTS(SELECT 1 FROM vault.secrets WHERE name='campaign_send_queue_internal') THEN RETURN false; END IF;
 PERFORM vault.create_secret(_secret,'campaign_send_queue_internal','Internal campaign send queue callback'); RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.install_campaign_queue_secret(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.install_campaign_queue_secret(text) TO service_role;
CREATE OR REPLACE FUNCTION public.dispatch_campaign_send_queue() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE k text;
BEGIN
 SELECT decrypted_secret INTO k FROM vault.decrypted_secrets WHERE name='campaign_send_queue_internal';
 IF k IS NULL THEN RETURN; END IF;
 PERFORM net.http_post(url:='https://dmgafmigqfycyaopdviw.supabase.co/functions/v1/send-queued-campaign',headers:=jsonb_build_object('Content-Type','application/json','x-campaign-queue-secret',k),body:='{}'::jsonb,timeout_milliseconds:=120000);
END $$;
REVOKE ALL ON FUNCTION public.dispatch_campaign_send_queue() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_campaign_send_queue() TO service_role;
DO $cron$ BEGIN IF NOT EXISTS(SELECT 1 FROM cron.job WHERE jobname='campaign-send-queue-daily') THEN PERFORM cron.schedule('campaign-send-queue-daily','0 8 * * *','SELECT public.dispatch_campaign_send_queue();'); END IF; END $cron$;