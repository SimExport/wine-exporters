CREATE OR REPLACE FUNCTION public.get_importer_export_contacts(_ids uuid[])
RETURNS TABLE(buyer_contact_id uuid, additional_emails text[], decision_makers text[], decision_maker_emails text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF public.is_exportvins_trial_user(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _ids IS NULL OR cardinality(_ids) = 0 THEN RETURN; END IF;
  IF cardinality(_ids) > 500 THEN RAISE EXCEPTION 'Too many ids'; END IF;
  RETURN QUERY
  SELECT b.id,
    coalesce((SELECT array_agg(DISTINCT lower(btrim(m.email))) FROM public.buyer_contact_enrichment_emails m
      WHERE m.buyer_contact_id = b.id AND btrim(m.email) <> ''), '{}'),
    coalesce((SELECT array_agg(x.label ORDER BY x.first) FROM (
      SELECT btrim(p.full_name) || coalesce(' (' || nullif(btrim(p.job_title),'') || ')','') AS label, min(p.created_at) AS first
      FROM public.buyer_contact_enrichment_people p WHERE p.buyer_contact_id = b.id AND btrim(p.full_name) <> ''
      GROUP BY 1) x), '{}'),
    coalesce((SELECT array_agg(DISTINCT lower(btrim(p.business_email))) FROM public.buyer_contact_enrichment_people p
      WHERE p.buyer_contact_id = b.id AND btrim(coalesce(p.business_email,'')) <> ''), '{}')
  FROM public.buyer_contacts b
  WHERE b.id = ANY(_ids);
END; $$;
REVOKE ALL ON FUNCTION public.get_importer_export_contacts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_importer_export_contacts(uuid[]) TO authenticated;