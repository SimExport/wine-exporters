CREATE OR REPLACE FUNCTION public.get_enriched_country_counts()
RETURNS TABLE(country text, enriched_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY
  SELECT b.country, count(*)::bigint
  FROM public.buyer_contact_enrichments e
  JOIN public.buyer_contacts b ON b.id = e.buyer_contact_id
  WHERE b.country IS NOT NULL AND btrim(b.country) <> ''
  GROUP BY b.country;
END; $$;
REVOKE ALL ON FUNCTION public.get_enriched_country_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_enriched_country_counts() TO authenticated;