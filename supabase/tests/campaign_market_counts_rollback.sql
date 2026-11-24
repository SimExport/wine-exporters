-- Run only as database owner/service administrative executor. No emails, cron or sender calls.
-- Fixtures are isolated with an unknown country label and fully rolled back.
BEGIN;
DO $test$
BEGIN
  IF has_function_privilege('anon','public.get_campaign_market_counts()','EXECUTE')
     OR NOT has_function_privilege('authenticated','public.get_campaign_market_counts()','EXECUTE') THEN
    RAISE EXCEPTION 'FAIL RPC privileges';
  END IF;
  IF public.normalize_campaign_market_country('Slovakia ' ) <> 'slovakia'
     OR public.normalize_campaign_market_country('England (UK)') <> 'united kingdom'
     OR public.normalize_campaign_market_country('UAE') <> 'united arab emirates'
     OR public.normalize_campaign_market_country(' Hong'||chr(160)||chr(160)||'Kong ') <> 'hong kong'
     OR public.normalize_campaign_market_country('Bosnia-Herzegovina') <> 'bosnia and herzegovina' THEN
    RAISE EXCEPTION 'FAIL alias parity';
  END IF;
  PERFORM set_config('request.jwt.claims','{}',true);
  BEGIN
    PERFORM * FROM public.get_campaign_market_counts();
    RAISE EXCEPTION 'FAIL signed-out was accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $test$;

INSERT INTO public.buyer_contacts(country,email,email_status)
SELECT CASE WHEN i<=75 THEN 'WE_CRM_CAMPAIGN_TEST ' ELSE 'WE_CRM_CAMPAIGN_TEST' END,
       CASE WHEN i=76 THEN 'we-test-1@example.invalid' ELSE 'we-test-'||i||'@example.invalid' END,
       'valid'
FROM generate_series(1,140) i;
INSERT INTO public.buyer_contacts(country,email,email_status) VALUES
('WE_CRM_CAMPAIGN_TEST','blocked@example.invalid','do_not_mail | role_based'),
('WE_CRM_CAMPAIGN_TEST','abuse@example.invalid','abuse | —'),
('WE_CRM_CAMPAIGN_TEST','broken','valid'),
('WE_CRM_CAMPAIGN_TEST','',NULL),
('WE_CRM_CAMPAIGN_TEST','mailto:multi@example.invalid; MULTI@example.invalid',NULL);

DO $test$
DECLARE n bigint; trial_id uuid;
BEGIN
  PERFORM set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
  SELECT usable_email_count INTO n FROM public.get_campaign_market_counts() WHERE country='we_crm_campaign_test';
  IF n<>140 THEN RAISE EXCEPTION 'FAIL counts: expected 139 distinct from 140 rows plus 1 multi-address, got %',n; END IF;
  SELECT user_id INTO trial_id FROM public.user_entitlements WHERE public.is_exportvins_trial_user(user_id) LIMIT 1;
  IF trial_id IS NULL THEN RAISE EXCEPTION 'Trial fixture unavailable: cannot claim trial exclusion was exercised'; END IF;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',trial_id,'role','authenticated')::text,true);
  BEGIN
    PERFORM * FROM public.get_campaign_market_counts();
    RAISE EXCEPTION 'FAIL trial was accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $test$;
ROLLBACK;
SELECT 'PASS: grants, aliases, signed-out, deduplication, composite statuses, multiple addresses, trial exclusion; fixtures rolled back' AS result;