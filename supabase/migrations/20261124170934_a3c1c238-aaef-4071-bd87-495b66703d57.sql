CREATE OR REPLACE FUNCTION public.normalize_campaign_market_country(_country text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $function$
WITH value AS (SELECT lower(btrim(regexp_replace(translate(coalesce(_country,''), chr(160)||chr(8239),'  '),'[[:space:]]+',' ','g'))) AS k)
SELECT CASE
WHEN k IN ('us','usa','u.s.','u.s.a.','united states of america','états-unis','etats-unis') THEN 'united states'
WHEN k IN ('uk','gb','u.k.','great britain','england (uk)','scotland (uk)','wales (uk)','northern ireland (uk)','royaume-uni') THEN 'united kingdom'
WHEN k IN ('uae','émirats arabes unis') THEN 'united arab emirates'
WHEN k IN ('czechia','république tchèque') THEN 'czech republic'
WHEN k IN ('the netherlands','pays-bas') THEN 'netherlands'
WHEN k = 'bosnia-herzegovina' THEN 'bosnia and herzegovina'
WHEN k = 'slovaquie' THEN 'slovakia'
WHEN k = 'indonésie' THEN 'indonesia'
WHEN k = 'bulgarie' THEN 'bulgaria'
WHEN k = 'chypre' THEN 'cyprus'
WHEN k = 'malaisie' THEN 'malaysia'
WHEN k = 'islande' THEN 'iceland'
WHEN k = 'azerbaïdjan' THEN 'azerbaijan'
ELSE k END FROM value
$function$;