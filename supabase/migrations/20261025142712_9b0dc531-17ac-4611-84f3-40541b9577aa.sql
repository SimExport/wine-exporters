ALTER TABLE public.buyer_contacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.buyer_contacts FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.buyer_contacts FROM authenticated;
CREATE POLICY "Admins can create buyer contacts" ON public.buyer_contacts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update buyer contacts" ON public.buyer_contacts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete buyer contacts" ON public.buyer_contacts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE OR REPLACE FUNCTION public.consume_export_credits(_count integer) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE remaining integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 IF _count IS NULL OR _count <= 0 OR _count > 500 THEN RAISE EXCEPTION 'Invalid count'; END IF;
 IF public.is_exportvins_trial_user(auth.uid()) THEN RETURN -1; END IF;
 UPDATE public.user_credits SET export_credits=export_credits-_count, updated_at=now() WHERE user_id=auth.uid() AND export_credits>=_count RETURNING export_credits INTO remaining;
 IF remaining IS NULL THEN RETURN -1; END IF;
 RETURN remaining;
END; $$;
CREATE OR REPLACE FUNCTION public.search_buyer_contacts(_countries text[], _q text, _offset integer, _limit integer) RETURNS TABLE(row_data jsonb, total_count bigint) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 IF public.is_exportvins_trial_user(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 RETURN QUERY
 WITH f AS (
 SELECT b.*, EXISTS (SELECT 1 FROM public.buyer_contact_enrichments e WHERE e.buyer_contact_id=b.id) AS is_enriched
 FROM public.buyer_contacts b WHERE b.country=ANY(_countries) AND (
 coalesce(trim(_q),'')='' OR extensions.unaccent(lower(coalesce(b.company_name,''))) LIKE '%' || extensions.unaccent(lower(trim(_q))) || '%'
 OR extensions.unaccent(lower(coalesce(b.city,''))) LIKE '%' || extensions.unaccent(lower(trim(_q))) || '%'
 OR extensions.unaccent(lower(coalesce(b.email,''))) LIKE '%' || extensions.unaccent(lower(trim(_q))) || '%'
 OR extensions.unaccent(lower(coalesce(b.full_address,''))) LIKE '%' || extensions.unaccent(lower(trim(_q))) || '%')),
 paged AS (SELECT to_jsonb(f.*) AS payload, f.id, count(*) OVER () AS total FROM f ORDER BY f.is_enriched DESC, f.company_name ASC NULLS LAST, f.id OFFSET greatest(_offset,0) LIMIT least(greatest(_limit,1),100))
 SELECT p.payload || jsonb_build_object('profile_highlights', coalesce((
 SELECT jsonb_agg(labels.label ORDER BY labels.first_position) FROM (
 SELECT trim(v.label) AS label, min(v.position) AS first_position
 FROM public.buyer_contact_enrichments e,
 LATERAL unnest(e.wine_specialties || e.wine_origins || e.distribution_channels) WITH ORDINALITY AS v(label,position)
 WHERE e.buyer_contact_id=p.id AND e.status IN ('verified','validated') AND e.confidence='high'
 AND EXISTS (SELECT 1 FROM unnest(e.source_urls) AS s(url) WHERE s.url ~ '^https?://[^/@[:space:]]+([/?#]|$)')
 AND length(trim(v.label))>0 GROUP BY trim(v.label) ORDER BY min(v.position) LIMIT 3
 ) labels), '[]'::jsonb)), p.total FROM paged p;
END; $$;