ALTER TABLE public.campaign_send_queue ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS campaign_send_queue_scheduled_at_key ON public.campaign_send_queue(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- Window during which a slot may be claimed: 10:00 slot until 15:00, 15:00 slot until midnight (Paris).
CREATE OR REPLACE FUNCTION public.campaign_slot_window_end(_slot timestamptz) RETURNS timestamptz
LANGUAGE sql STABLE SET search_path=public AS $$
 SELECT CASE WHEN (_slot AT TIME ZONE 'Europe/Paris')::time < time '15:00'
   THEN ((_slot AT TIME ZONE 'Europe/Paris')::date + time '15:00') AT TIME ZONE 'Europe/Paris'
   ELSE (((_slot AT TIME ZONE 'Europe/Paris')::date + 1)::timestamp) AT TIME ZONE 'Europe/Paris' END
$$;

-- Distinct real sends/reservations of a Paris day: queue slots (consumed, plus queued when _include_queued)
-- and real manual/legacy sends (send_started_at or launch that day), test campaigns excluded. UNION = no double count.
CREATE OR REPLACE FUNCTION public.campaign_send_day_usage(_day date, _include_queued boolean) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT count(*)::int FROM (
  SELECT q.campaign_id FROM public.campaign_send_queue q
   WHERE q.scheduled_at IS NOT NULL AND (q.scheduled_at AT TIME ZONE 'Europe/Paris')::date=_day
     AND (_include_queued OR q.state<>'queued')
  UNION
  SELECT c.id FROM public.campaigns c
   WHERE ((c.send_started_at IS NOT NULL AND (c.send_started_at AT TIME ZONE 'Europe/Paris')::date=_day)
       OR (c.launched_at IS NOT NULL AND c.status IN ('active','sending','results') AND (c.launched_at AT TIME ZONE 'Europe/Paris')::date=_day))
     AND NOT public.is_test_campaign(c.id)
 ) u
$$;

CREATE OR REPLACE FUNCTION public.campaign_next_free_slot(_allow_due boolean, _now timestamptz) RETURNS timestamptz
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE d date := (_now AT TIME ZONE 'Europe/Paris')::date; s timestamptz; t time; i int;
BEGIN
 FOR i IN 0..400 LOOP
  IF public.campaign_send_day_usage(d+i, true) < 2 THEN
   FOREACH t IN ARRAY ARRAY[time '10:00', time '15:00'] LOOP
    s := ((d+i) + t) AT TIME ZONE 'Europe/Paris';
    IF (s > _now OR (_allow_due AND _now < public.campaign_slot_window_end(s)))
       AND NOT EXISTS (SELECT 1 FROM public.campaign_send_queue WHERE scheduled_at=s) THEN
      RETURN s;
    END IF;
   END LOOP;
  END IF;
 END LOOP;
 RAISE EXCEPTION 'No free send slot';
END $$;

CREATE OR REPLACE FUNCTION public.campaign_queue_eligible(_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id=_id AND c.status='pending_validation'
   AND COALESCE(c.email_content->>'version','')='2' AND btrim(COALESCE(c.message_html,''))<>''
   AND c.send_started_at IS NULL AND c.brevo_campaign_id IS NULL) AND NOT public.is_test_campaign(_id)
$$;

-- FIFO re-slotting of never-attempted queued rows only. Ineligible rows keep no slot (never claimable).
CREATE OR REPLACE FUNCTION public.reallocate_campaign_send_slots(_allow_due boolean, _now timestamptz) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; n int := 0;
BEGIN
 PERFORM pg_advisory_xact_lock(724350118);
 PERFORM 1 FROM public.campaign_send_queue WHERE state='queued' AND attempted_at IS NULL FOR UPDATE;
 UPDATE public.campaign_send_queue SET scheduled_at=NULL WHERE state='queued' AND attempted_at IS NULL AND scheduled_at IS NOT NULL;
 FOR r IN SELECT campaign_id FROM public.campaign_send_queue WHERE state='queued' AND attempted_at IS NULL ORDER BY approved_at, campaign_id LOOP
  IF public.campaign_queue_eligible(r.campaign_id) THEN
   UPDATE public.campaign_send_queue SET scheduled_at=public.campaign_next_free_slot(_allow_due,_now) WHERE campaign_id=r.campaign_id;
   n := n+1;
  END IF;
 END LOOP;
 RETURN n;
END $$;

-- Durable slot consumption: an attempted/non-queued row can never be re-queued nor moved.
CREATE OR REPLACE FUNCTION public.campaign_send_queue_slot_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF OLD.state<>'queued' AND NEW.state='queued' THEN RAISE EXCEPTION 'Queue entry cannot be re-queued'; END IF;
 IF OLD.attempted_at IS NOT NULL AND NEW.attempted_at IS DISTINCT FROM OLD.attempted_at THEN RAISE EXCEPTION 'Attempt is final'; END IF;
 IF (OLD.state<>'queued' OR OLD.attempted_at IS NOT NULL) AND NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at THEN RAISE EXCEPTION 'Consumed slot is final'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS campaign_send_queue_slot_guard ON public.campaign_send_queue;
CREATE TRIGGER campaign_send_queue_slot_guard BEFORE UPDATE ON public.campaign_send_queue FOR EACH ROW EXECUTE FUNCTION public.campaign_send_queue_slot_guard();

-- Every real send-start (manual, legacy, queue) is serialized with claims/approvals via the same lock.
CREATE OR REPLACE FUNCTION public.campaign_send_start_serialize() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN PERFORM pg_advisory_xact_lock(724350118); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS campaign_send_start_serialize ON public.campaigns;
CREATE TRIGGER campaign_send_start_serialize BEFORE UPDATE OF send_started_at ON public.campaigns FOR EACH ROW
 WHEN (OLD.send_started_at IS NULL AND NEW.send_started_at IS NOT NULL) EXECUTE FUNCTION public.campaign_send_start_serialize();

CREATE OR REPLACE FUNCTION public.approve_campaign_for_queue(_id uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.campaigns%ROWTYPE; st text;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 PERFORM pg_advisory_xact_lock(724350118);
 SELECT state INTO st FROM public.campaign_send_queue WHERE campaign_id=_id;
 IF FOUND THEN RETURN st; END IF; -- idempotent (double click)
 SELECT * INTO c FROM public.campaigns WHERE id=_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;
 IF c.status<>'pending_validation' THEN RAISE EXCEPTION 'Campaign is not pending validation'; END IF;
 IF COALESCE((c.email_content->>'version')::int,0)<>2 OR btrim(COALESCE(c.message_html,''))='' THEN RAISE EXCEPTION 'Only custom email campaigns can be scheduled'; END IF;
 IF public.is_test_campaign(_id) THEN RAISE EXCEPTION 'Test campaigns cannot be scheduled'; END IF;
 IF c.send_started_at IS NOT NULL OR c.brevo_campaign_id IS NOT NULL THEN RAISE EXCEPTION 'Campaign already sent or send in progress'; END IF;
 INSERT INTO public.campaign_send_queue(campaign_id,approved_by,scheduled_at) VALUES(_id,auth.uid(),public.campaign_next_free_slot(false,now()));
 RETURN 'queued';
END $$;

CREATE OR REPLACE FUNCTION public.cancel_campaign_queue(_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 PERFORM pg_advisory_xact_lock(724350118);
 DELETE FROM public.campaign_send_queue WHERE campaign_id=_id AND state IN ('queued','failed');
 RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.claim_campaign_send_at(_now timestamptz) RETURNS SETOF public.campaign_send_queue
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE q public.campaign_send_queue%ROWTYPE; cid uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(724350118);
 IF EXISTS (SELECT 1 FROM public.campaign_send_queue WHERE state='queued' AND attempted_at IS NULL
   AND (scheduled_at IS NULL AND public.campaign_queue_eligible(campaign_id) OR public.campaign_slot_window_end(scheduled_at) <= _now)) THEN
  PERFORM public.reallocate_campaign_send_slots(true,_now);
 END IF;
 SELECT * INTO q FROM public.campaign_send_queue WHERE state='queued' AND attempted_at IS NULL AND scheduled_at IS NOT NULL
   AND scheduled_at <= _now AND _now < public.campaign_slot_window_end(scheduled_at)
   ORDER BY scheduled_at LIMIT 1 FOR UPDATE SKIP LOCKED;
 IF NOT FOUND THEN RETURN; END IF;
 IF public.campaign_send_day_usage((q.scheduled_at AT TIME ZONE 'Europe/Paris')::date, false) >= 2 THEN
  PERFORM public.reallocate_campaign_send_slots(true,_now); -- day exhausted (e.g. manual sends): move forward, FIFO
  RETURN;
 END IF;
 SELECT id INTO cid FROM public.campaigns WHERE id=q.campaign_id FOR UPDATE SKIP LOCKED;
 IF NOT FOUND THEN RETURN; END IF; -- campaign busy elsewhere: retry next tick, slot untouched
 IF NOT public.campaign_queue_eligible(q.campaign_id) THEN
  UPDATE public.campaign_send_queue SET state='failed', error='not_eligible', attempted_at=_now WHERE campaign_id=q.campaign_id;
  RETURN;
 END IF;
 UPDATE public.campaign_send_queue SET state='sending', attempted_at=_now, updated_at=now() WHERE campaign_id=q.campaign_id AND state='queued' RETURNING * INTO q;
 RETURN NEXT q;
END $$;

CREATE OR REPLACE FUNCTION public.claim_campaign_send() RETURNS SETOF public.campaign_send_queue
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT * FROM public.claim_campaign_send_at(now()) $$;

CREATE OR REPLACE FUNCTION public.dispatch_campaign_send_queue_if_due() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM public.campaign_send_queue WHERE state='queued' AND attempted_at IS NULL AND scheduled_at IS NOT NULL AND scheduled_at <= now()) THEN
  PERFORM public.dispatch_campaign_send_queue();
 END IF;
END $$;

REVOKE ALL ON FUNCTION public.campaign_slot_window_end(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.campaign_send_day_usage(date,boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.campaign_next_free_slot(boolean,timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.campaign_queue_eligible(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reallocate_campaign_send_slots(boolean,timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_campaign_send_at(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_campaign_send() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dispatch_campaign_send_queue_if_due() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.campaign_send_queue_slot_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.campaign_send_start_serialize() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_campaign_send() TO service_role;
GRANT EXECUTE ON FUNCTION public.dispatch_campaign_send_queue_if_due() TO service_role;
REVOKE ALL ON FUNCTION public.approve_campaign_for_queue(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_campaign_queue(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_campaign_for_queue(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_campaign_queue(uuid) TO authenticated;

-- Re-slot the never-attempted queued campaigns (FIFO, future slots only).
SELECT public.reallocate_campaign_send_slots(false, now());

-- Replace the 08:00 UTC daily trigger by an hourly due-check (08–22 UTC covers 10:00/15:00 Paris in CET and CEST).
DO $cron$ BEGIN
 IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='campaign-send-queue-daily') THEN PERFORM cron.unschedule('campaign-send-queue-daily'); END IF;
 IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='campaign-send-queue-slots') THEN
  PERFORM cron.schedule('campaign-send-queue-slots','0 8-22 * * *','SELECT public.dispatch_campaign_send_queue_if_due();');
 END IF;
END $cron$;