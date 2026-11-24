CREATE OR REPLACE FUNCTION public.normalize_campaign_market_country(_country text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $function$
WITH value AS (SELECT lower(btrim(regexp_replace(translate(coalesce(_country,''), chr(160)||chr(8239),'  '),'[[:space:]]+',' ','g'))) AS k)
SELECT CASE
WHEN k IN ('us','usa','u.s.','u.s.a.','united states of america','états-unis','etats-unis') THEN 'united states'
WHEN k IN ('uk','gb','u.k.','great britain','england (uk)','scotland (uk)','wales (uk)','northern ireland (uk)','royaume-uni') THEN 'united kingdom'
WHEN k IN ('uae','émirats arabes unis') THEN 'united arab emirates'
WHEN k IN ('czechia','république tchèque') THEN 'czech republic'
WHEN k IN ('the netherlands','pays-bas') THEN 'netherlands'
WHEN k = 'bosnia-herzegovina' THEN 'bosnia and herzეგovina'
WHEN k = 'slovaquie' THEN 'slovakia'
WHEN k = 'indonésie' THEN 'indonesia'
WHEN k = 'bulgarie' THEN 'bulgaria'
WHEN k = 'chypre' THEN 'cyprus'
WHEN k = 'malaisie' THEN 'malaysia'
WHEN k = 'islande' THEN 'iceland'
WHEN k = 'azerbaïdjan' THEN 'azerbaijan'
ELSE k END FROM value
$function$;
REVOKE ALL ON FUNCTION public.normalize_campaign_market_country(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_campaign_market_country(text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_campaign_market_counts()
RETURNS TABLE(country text, usable_email_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  IF public.is_exportvins_trial_user(auth.uid()) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
  RETURN QUERY
  WITH eligible AS (
    SELECT public.normalize_campaign_market_country(b.country) AS market,
           lower(regexp_replace(e.address,'^mailto:','','i')) AS address
    FROM public.buyer_contacts b
    CROSS JOIN LATERAL regexp_split_to_table(coalesce(b.email,''),'[[:space:],;]+') AS e(address)
    WHERE nullif(btrim(b.country),'') IS NOT NULL
      AND coalesce(b.email_status,'') !~* '(^|[[:space:]|,;])(do_not_mail|invalid|bounced|hard_bounce|blocked|blacklisted|unsubscribed|suppressed|abuse)([[:space:]|,;]|$)'
  )
  SELECT e.market, count(DISTINCT e.address)::bigint
  FROM eligible e
  WHERE e.market <> '' AND e.address ~ '^[^[:space:]@<>";,]+@[^[:space:]@<>";,]+\.[^[:space:]@<>";,]+$'
  GROUP BY e.market ORDER BY e.market;
END
$function$;
REVOKE ALL ON FUNCTION public.get_campaign_market_counts() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_campaign_market_counts() TO authenticated;
COMMENT ON FUNCTION public.get_campaign_market_counts() IS 'WineExporters only: distinct syntactically valid candidate addresses per canonical country; no delivery guarantee, individual data, campaign mutation or Brevo call.';