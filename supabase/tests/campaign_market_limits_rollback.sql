-- Isolated PostgreSQL/PGlite fixture only: never run against production.
-- The live equivalent (4/5/16/20/21, aliases, history/credits/queue hashes) was run once on 2026-11-24 in a DO block ending in RAISE, fully rolled back.
-- The runner first creates a minimal public.campaigns fixture and applies the draft SQL.
BEGIN;
DO $test$
DECLARE values20 text[] := ARRAY['Austria','Belgium','Croatia','Czech Republic','Denmark','Estonia','Finland','Germany','Greece','Hungary','Ireland','Italy','Netherlands','Norway','Poland','Portugal','Romania','Serbia','Spain','Sweden'];
BEGIN
  INSERT INTO public.campaigns(id,status,target_markets) VALUES ('min','draft',values20[1:4]);
  BEGIN
    UPDATE public.campaigns SET status='pending_validation' WHERE id='min';
    RAISE EXCEPTION 'FAIL: four markets submitted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  UPDATE public.campaigns SET target_markets=values20[1:5],status='pending_validation' WHERE id='min';
  IF (SELECT status FROM public.campaigns WHERE id='min') <> 'pending_validation' THEN RAISE EXCEPTION 'FAIL: five markets refused'; END IF;

  INSERT INTO public.campaigns(id,status,target_markets) VALUES ('max','draft',values20);
  UPDATE public.campaigns SET status='pending_validation' WHERE id='max';
  IF (SELECT status FROM public.campaigns WHERE id='max') <> 'pending_validation' THEN RAISE EXCEPTION 'FAIL: twenty markets refused'; END IF;
  BEGIN
    INSERT INTO public.campaigns(id,status,target_markets) VALUES ('overflow','draft',values20||'Canada'::text);
    RAISE EXCEPTION 'FAIL: twenty-one markets saved';
  EXCEPTION WHEN check_violation THEN NULL; END;

  INSERT INTO public.campaigns(id,status,target_markets) VALUES ('aliases','draft',ARRAY['USA','United States','United Kingdom','England','Canada']);
  BEGIN
    UPDATE public.campaigns SET status='pending_validation' WHERE id='aliases';
    RAISE EXCEPTION 'FAIL: aliases inflated the minimum';
  EXCEPTION WHEN check_violation THEN NULL; END;
  IF public.normalize_campaign_market_country('Bosnia–Herzegovina') <> 'bosnia and herzegovina'
     OR public.normalize_campaign_market_country('Northern Ireland') <> 'united kingdom'
     OR public.normalize_campaign_market_country('Macao ') <> 'macau'
     OR public.normalize_campaign_market_country('Türkiye') <> 'turkey'
     OR public.normalize_campaign_market_country('Curaçao') <> 'curacao'
     OR public.normalize_campaign_market_country(' United'||chr(160)||'States ') <> 'united states' THEN
    RAISE EXCEPTION 'FAIL: aliases differ from shared catalogue';
  END IF;

  UPDATE public.campaigns SET note='updated' WHERE id='historic';
  IF (SELECT target_markets FROM public.campaigns WHERE id='historic') <> ARRAY['USA']
     OR (SELECT status FROM public.campaigns WHERE id='historic') <> 'active' THEN RAISE EXCEPTION 'FAIL: historical row changed'; END IF;
  INSERT INTO public.campaigns(id,status,target_markets) VALUES ('manual','manual',NULL);
  INSERT INTO public.campaigns(id,status,target_markets) VALUES ('empty-draft','draft',NULL);
END
$test$;
ROLLBACK;