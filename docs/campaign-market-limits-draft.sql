-- DRAFT ONLY: not applied to Supabase. Submit through the migration tool on approval.
-- No data updates, RLS changes, email calls, credit changes or scheduling changes.
BEGIN;

CREATE OR REPLACE FUNCTION public.normalize_campaign_market_country(_country text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $function$
WITH value AS (
  SELECT lower(btrim(regexp_replace(translate(normalize(coalesce(_country,''), NFKC), chr(160)||chr(8239)||'‐‑–—','  ----'),'[[:space:]]+',' ','g'))) AS k
)
SELECT CASE
WHEN k IN ('us','usa','u.s.','u.s.a.','united states of america','états-unis','etats-unis') THEN 'united states'
WHEN k IN ('uk','gb','u.k.','great britain','england','scotland','wales','northern ireland','england (uk)','scotland (uk)','wales (uk)','northern ireland (uk)','royaume-uni') THEN 'united kingdom'
WHEN k IN ('uae','émirats arabes unis') THEN 'united arab emirates'
WHEN k IN ('czechia','république tchèque') THEN 'czech republic'
WHEN k IN ('the netherlands','pays-bas') THEN 'netherlands'
WHEN k IN ('bosnia-herzegovina','bosnia herzegovina','bosnia & herzegovina','bosnia and hercegovina','bosnie-herzégovine') THEN 'bosnia and herzegovina'
WHEN k IN ('türkiye','turkiye','turquie') THEN 'turkey'
WHEN k = 'macao' THEN 'macau'
WHEN k = 'curaçao' THEN 'curacao'
WHEN k IN ('republic of north macedonia','macedonia') THEN 'north macedonia'
WHEN k = 'slovaquie' THEN 'slovakia'
WHEN k = 'indonésie' THEN 'indonesia'
WHEN k = 'bulgarie' THEN 'bulgaria'
WHEN k = 'chypre' THEN 'cyprus'
WHEN k = 'malaisie' THEN 'malaysia'
WHEN k = 'islande' THEN 'iceland'
WHEN k = 'azerbaïdjan' THEN 'azerbaijan'
ELSE k END FROM value
$function$;
-- CREATE OR REPLACE preserves the existing private function's grants.

ALTER TABLE public.campaigns DROP CONSTRAINT campaigns_markets_count_check;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_markets_count_check
  CHECK (array_length(target_markets, 1) >= 1 AND array_length(target_markets, 1) <= 20) NOT VALID;
-- NOT VALID protects future writes without rejecting or rewriting historical rows.

CREATE OR REPLACE FUNCTION public.campaign_market_selection_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $function$
DECLARE n integer;
BEGIN
  -- Only new submission from draft: legacy/manual/sent rows are not retroactively validated.
  IF TG_OP = 'UPDATE' AND OLD.status = 'draft' AND NEW.status = 'pending_validation' THEN
    SELECT count(DISTINCT public.normalize_campaign_market_country(value)) INTO n
    FROM unnest(coalesce(NEW.target_markets, ARRAY[]::text[])) AS selected(value)
    WHERE public.normalize_campaign_market_country(value) <> '';
    IF n < 5 OR n > 20 THEN
      RAISE EXCEPTION 'campaigns_markets_count_check: select between 5 and 20 distinct markets' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END
$function$;
REVOKE ALL ON FUNCTION public.campaign_market_selection_guard() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.campaign_market_selection_guard() TO service_role;
CREATE TRIGGER campaign_market_selection_guard BEFORE UPDATE OF status ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.campaign_market_selection_guard();

COMMIT;