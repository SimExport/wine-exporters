CREATE OR REPLACE FUNCTION public.get_enrichment_activity(_days integer)
RETURNS TABLE(country text, enriched_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF public.is_exportvins_trial_user(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
  SELECT b.country, count(*)::bigint
  FROM public.buyer_contact_enrichments e
  JOIN public.buyer_contacts b ON b.id = e.buyer_contact_id
  WHERE (coalesce(e.created_at, e.last_enriched_at) AT TIME ZONE 'Europe/Paris')::date
        > (now() AT TIME ZONE 'Europe/Paris')::date - greatest(least(coalesce(_days,1),30),1)
  GROUP BY b.country
  ORDER BY 2 DESC, 1;
END; $$;
REVOKE ALL ON FUNCTION public.get_enrichment_activity(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_enrichment_activity(integer) TO authenticated;