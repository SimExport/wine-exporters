CREATE OR REPLACE FUNCTION public.search_buyer_contacts(_countries text[], _q text, _offset integer, _limit integer)
 RETURNS TABLE(row_data jsonb, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF public.is_exportvins_trial_user(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
  WITH f AS (
    SELECT b.*, EXISTS (SELECT 1 FROM public.buyer_contact_enrichments e WHERE e.buyer_contact_id = b.id) AS is_enriched
    FROM public.buyer_contacts b
    WHERE b.country = ANY(_countries)
      AND (
        coalesce(trim(_q),'') = ''
        OR extensions.unaccent(lower(coalesce(b.company_name,''))) LIKE '%' || extensions.unaccent(lower(trim(_q))) || '%'
        OR extensions.unaccent(lower(coalesce(b.city,''))) LIKE '%' || extensions.unaccent(lower(trim(_q))) || '%'
        OR extensions.unaccent(lower(coalesce(b.email,''))) LIKE '%' || extensions.unaccent(lower(trim(_q))) || '%'
        OR extensions.unaccent(lower(coalesce(b.full_address,''))) LIKE '%' || extensions.unaccent(lower(trim(_q))) || '%'
      )
  )
  SELECT to_jsonb(f.*), count(*) OVER () FROM f
  ORDER BY f.is_enriched DESC, f.company_name ASC NULLS LAST, f.id
  OFFSET greatest(_offset,0) LIMIT least(greatest(_limit,1),100);
END; $function$;