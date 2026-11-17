-- Rollback-only DB test for the 2-slot/day campaign send queue (10:00 / 15:00 Europe/Paris).
-- Runs against the live schema inside ONE transaction and always ends with RAISE EXCEPTION,
-- so every change (claims, approvals, fake campaigns) is rolled back. No HTTP call, no Brevo, no email:
-- it calls claim_campaign_send_at() directly (never the worker or dispatch).
DO $t$
DECLARE
  K constant text := 'TEST';
  q record; n int; s timestamptz; owner uuid; adm uuid; a uuid; b uuid; c uuid; m1 uuid; m2 uuid; t uuid;
  h_before text; h_after text; tgt_before text; tgt_after text; ok boolean; log text := '';
  CHF constant uuid := '868f5899-b628-4483-8754-381f7888072b';
  DUM constant uuid := 'bd354907-ce54-4f5d-9291-f3cc9ef93374';
  SPA constant uuid := '32cacc35-7363-4d05-a6e4-9aba80e3d796';
  GOU constant uuid := '8bbb1211-9c73-4739-97ad-1723e19d7877';
BEGIN
  SELECT md5(string_agg(c::text, '|' ORDER BY id)) INTO h_before FROM public.campaigns c WHERE status<>'pending_validation';
  SELECT md5(string_agg(concat_ws('#',id,target_markets,markets,message_html,subject_selected,email_content,doc_presentation,doc_pricelist,doc_techs,selected_wines,stats_opens,stats_clicks), '|' ORDER BY id))
    INTO tgt_before FROM public.campaigns WHERE id IN (CHF,DUM,SPA,GOU);
  SELECT user_id INTO owner FROM public.campaigns WHERE id=CHF;
  SELECT user_id INTO adm FROM public.user_roles WHERE role='admin' LIMIT 1;

  -- T1 DST-safe slot math (no reservation exists on these days)
  IF public.campaign_next_free_slot(false,'2026-07-15 07:00Z') <> '2026-07-15 08:00Z' THEN RAISE EXCEPTION 'FAIL T1 summer 10h'; END IF;
  IF public.campaign_next_free_slot(false,'2026-07-15 09:00Z') <> '2026-07-15 13:00Z' THEN RAISE EXCEPTION 'FAIL T1 summer 15h'; END IF;
  IF public.campaign_next_free_slot(false,'2026-12-01 08:30Z') <> '2026-12-01 09:00Z' THEN RAISE EXCEPTION 'FAIL T1 winter 10h'; END IF;
  IF public.campaign_next_free_slot(false,'2026-12-01 09:00Z') <> '2026-12-01 14:00Z' THEN RAISE EXCEPTION 'FAIL T1 never a past/now slot'; END IF;
  IF public.campaign_next_free_slot(false,'2026-12-01 15:00Z') <> '2026-12-02 09:00Z' THEN RAISE EXCEPTION 'FAIL T1 next day'; END IF;
  IF public.campaign_slot_window_end('2026-12-01 09:00Z') <> '2026-12-01 14:00Z' OR public.campaign_slot_window_end('2026-12-01 14:00Z') <> '2026-12-01 23:00Z' THEN RAISE EXCEPTION 'FAIL T1 windows'; END IF;
  log := log || 'T1 ok;';

  -- T2 future slot refused
  SELECT count(*) INTO n FROM public.claim_campaign_send_at('2026-11-18 08:59Z');
  IF n<>0 OR (SELECT state FROM public.campaign_send_queue WHERE campaign_id=CHF)<>'queued' THEN RAISE EXCEPTION 'FAIL T2'; END IF;
  log := log || 'T2 ok;';
  -- T3 due morning slot claimed (FIFO first = Chateau de France)
  SELECT * INTO q FROM public.claim_campaign_send_at('2026-11-18 09:00:30Z');
  IF q.campaign_id IS DISTINCT FROM CHF OR q.state<>'sending' THEN RAISE EXCEPTION 'FAIL T3 %', q.campaign_id; END IF;
  -- global lock really taken by the claim
  IF NOT EXISTS (SELECT 1 FROM pg_locks WHERE locktype='advisory' AND objid=724350118 AND pid=pg_backend_pid() AND granted) THEN RAISE EXCEPTION 'FAIL T3 lock'; END IF;
  log := log || 'T3 ok;';
  -- T4 repeat claim same slot / afternoon not yet due
  SELECT count(*) INTO n FROM public.claim_campaign_send_at('2026-11-18 09:00:31Z'); IF n<>0 THEN RAISE EXCEPTION 'FAIL T4a'; END IF;
  SELECT count(*) INTO n FROM public.claim_campaign_send_at('2026-11-18 11:30Z'); IF n<>0 THEN RAISE EXCEPTION 'FAIL T4b'; END IF;
  log := log || 'T4 ok;';
  -- T5 worker crash / uncertain: slot consumed for good, never re-queued nor moved
  UPDATE public.campaign_send_queue SET state='needs_review', error='uncertain' WHERE campaign_id=CHF;
  ok := false; BEGIN UPDATE public.campaign_send_queue SET state='queued' WHERE campaign_id=CHF; EXCEPTION WHEN others THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'FAIL T5 requeue allowed'; END IF;
  ok := false; BEGIN UPDATE public.campaign_send_queue SET scheduled_at='2030-01-01Z' WHERE campaign_id=CHF; EXCEPTION WHEN others THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'FAIL T5 slot move allowed'; END IF;
  log := log || 'T5 ok;';
  -- T6 second departure of the day
  SELECT * INTO q FROM public.claim_campaign_send_at('2026-11-18 14:00:30Z');
  IF q.campaign_id IS DISTINCT FROM DUM THEN RAISE EXCEPTION 'FAIL T6'; END IF;
  IF public.campaign_send_day_usage('2026-11-18',false)<>2 THEN RAISE EXCEPTION 'FAIL T6 usage'; END IF;
  -- T7 no evening backlog drain (Spannagel waits for 19/11 10:00)
  SELECT count(*) INTO n FROM public.claim_campaign_send_at('2026-11-18 20:00Z'); IF n<>0 THEN RAISE EXCEPTION 'FAIL T7'; END IF;
  log := log || 'T6-7 ok;';

  -- T8 approvals: admin only, idempotent double click, 3rd of a day deferred
  PERFORM set_config('request.jwt.claims', json_build_object('sub',owner,'role','authenticated')::text, true);
  INSERT INTO public.campaigns(user_id,name,target_markets,status,email_content,message_html) VALUES
    (owner,'T-A','{France}','pending_validation','{"version":2}','<p>x</p>') RETURNING id INTO a;
  INSERT INTO public.campaigns(user_id,name,target_markets,status,email_content,message_html) VALUES
    (owner,'T-B','{France}','pending_validation','{"version":2}','<p>x</p>') RETURNING id INTO b;
  INSERT INTO public.campaigns(user_id,name,target_markets,status,email_content,message_html) VALUES
    (owner,'T-C','{France}','pending_validation','{"version":2}','<p>x</p>') RETURNING id INTO c;
  INSERT INTO public.campaigns(user_id,name,target_markets,status,email_content,message_html) VALUES
    (owner,'T-T','{France}','pending_validation','{"version":2}','<p>x</p>') RETURNING id INTO t;
  INSERT INTO public.campaign_events(campaign_id,type,payload) VALUES (t,'test_campaign','{}');
  IF NOT public.has_role(owner,'admin') THEN
    ok := false; BEGIN PERFORM public.approve_campaign_for_queue(a); EXCEPTION WHEN others THEN ok := SQLERRM='Forbidden'; END;
    IF NOT ok THEN RAISE EXCEPTION 'FAIL T8 non-admin'; END IF;
  END IF;
  PERFORM set_config('request.jwt.claims', json_build_object('sub',adm,'role','authenticated')::text, true);
  PERFORM public.approve_campaign_for_queue(a);
  s := (SELECT scheduled_at FROM public.campaign_send_queue WHERE campaign_id=a);
  IF public.approve_campaign_for_queue(a)<>'queued' OR (SELECT count(*) FROM public.campaign_send_queue WHERE campaign_id=a)<>1
     OR (SELECT scheduled_at FROM public.campaign_send_queue WHERE campaign_id=a)<>s THEN RAISE EXCEPTION 'FAIL T8 double click'; END IF;
  PERFORM public.approve_campaign_for_queue(b); PERFORM public.approve_campaign_for_queue(c);
  IF s <> '2026-11-20 09:00Z' OR (SELECT scheduled_at FROM public.campaign_send_queue WHERE campaign_id=b) <> '2026-11-20 14:00Z'
     OR (SELECT scheduled_at FROM public.campaign_send_queue WHERE campaign_id=c) <> '2026-11-21 09:00Z' THEN RAISE EXCEPTION 'FAIL T8 slots % ', s; END IF;
  ok := false; BEGIN PERFORM public.approve_campaign_for_queue(t); EXCEPTION WHEN others THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'FAIL T8 test campaign queued'; END IF;
  log := log || 'T8 ok;';

  -- T9 a day exhausted by two real manual sends: due slot not consumed, FIFO moved forward
  INSERT INTO public.campaigns(user_id,name,target_markets,status,email_content,message_html) VALUES
    (owner,'T-M1','{France}','pending_validation','{"version":2}','<p>x</p>') RETURNING id INTO m1;
  INSERT INTO public.campaigns(user_id,name,target_markets,status,email_content,message_html) VALUES
    (owner,'T-M2','{France}','pending_validation','{"version":2}','<p>x</p>') RETURNING id INTO m2;
  UPDATE public.campaigns SET send_started_at='2026-11-19 07:00Z' WHERE id=m1;
  UPDATE public.campaigns SET send_started_at='2026-11-19 07:10Z' WHERE id=m2;
  SELECT count(*) INTO n FROM public.claim_campaign_send_at('2026-11-19 09:00:30Z'); IF n<>0 THEN RAISE EXCEPTION 'FAIL T9 claimed'; END IF;
  IF (SELECT scheduled_at FROM public.campaign_send_queue WHERE campaign_id=SPA)<>'2026-11-20 09:00Z'
     OR (SELECT scheduled_at FROM public.campaign_send_queue WHERE campaign_id=GOU)<>'2026-11-20 14:00Z'
     OR (SELECT scheduled_at FROM public.campaign_send_queue WHERE campaign_id=a)<>'2026-11-21 09:00Z'
     OR (SELECT scheduled_at FROM public.campaign_send_queue WHERE campaign_id=b)<>'2026-11-21 14:00Z'
     OR (SELECT scheduled_at FROM public.campaign_send_queue WHERE campaign_id=c)<>'2026-11-22 09:00Z'
     OR (SELECT attempted_at FROM public.campaign_send_queue WHERE campaign_id=SPA) IS NOT NULL THEN RAISE EXCEPTION 'FAIL T9 FIFO'; END IF;
  log := log || 'T9 ok;';
  -- T10 missed morning window (cron down) -> re-slotted, never sent late in the evening
  SELECT count(*) INTO n FROM public.claim_campaign_send_at('2026-11-20 14:30Z');
  -- Spannagel's 10:00 window ended (14:00Z): FIFO re-slot gives it today's still-open 15:00 slot, Gourgazaud moves to 21/11
  IF (SELECT state FROM public.campaign_send_queue WHERE campaign_id=SPA)<>'sending'
     OR (SELECT scheduled_at FROM public.campaign_send_queue WHERE campaign_id=SPA)<>'2026-11-20 14:00Z'
     OR (SELECT scheduled_at FROM public.campaign_send_queue WHERE campaign_id=GOU)<>'2026-11-21 09:00Z' THEN RAISE EXCEPTION 'FAIL T10'; END IF;
  log := log || 'T10 ok;';

  -- T11 sent/past campaigns and targeting/content/documents/stats untouched
  SELECT md5(string_agg(c::text, '|' ORDER BY id)) INTO h_after FROM public.campaigns c WHERE status<>'pending_validation';
  SELECT md5(string_agg(concat_ws('#',id,target_markets,markets,message_html,subject_selected,email_content,doc_presentation,doc_pricelist,doc_techs,selected_wines,stats_opens,stats_clicks), '|' ORDER BY id))
    INTO tgt_after FROM public.campaigns WHERE id IN (CHF,DUM,SPA,GOU);
  IF h_after<>h_before OR tgt_after<>tgt_before THEN RAISE EXCEPTION 'FAIL T11'; END IF;
  log := log || 'T11 ok;';

  RAISE EXCEPTION 'ALL_TESTS_PASSED (rolled back): %', log;
END $t$;
