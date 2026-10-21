CREATE OR REPLACE FUNCTION public.get_importer_profile(_buyer_contact_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Same perimeter as the /importers page: any authenticated user except
  -- ExportVins CRM trial accounts (PremiumGate blocks them client-side).
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF public.is_exportvins_trial_user(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN jsonb_build_object(
    'enrichment', (
      SELECT jsonb_build_object(
        'description_fr', e.description_fr,
        'description_en', e.description_en,
        'confidence', e.confidence,
        'status', e.status,
        'wine_origins', e.wine_origins,
        'wine_regions', e.wine_regions,
        'wine_appellations', e.wine_appellations,
        'wine_styles', e.wine_styles,
        'wine_specialties', e.wine_specialties,
        'featured_producers', e.featured_producers,
        'distribution_channels', e.distribution_channels,
        'direct_import_status', e.direct_import_status,
        'source_urls', e.source_urls
      )
      FROM public.buyer_contact_enrichments e
      WHERE e.buyer_contact_id = _buyer_contact_id
      LIMIT 1
    ),
    'people', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'job_title', p.job_title,
        'business_email', p.business_email,
        'business_phone', p.business_phone,
        'linkedin_url', p.linkedin_url,
        'source_url', p.source_url,
        'confidence', p.confidence,
        'last_verified_at', p.last_verified_at
      ) ORDER BY p.created_at)
      FROM public.buyer_contact_enrichment_people p
      WHERE p.buyer_contact_id = _buyer_contact_id
    ), '[]'::jsonb),
    'emails', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', m.id,
        'email', m.email,
        'email_purpose', m.email_purpose,
        'source_url', m.source_url,
        'confidence', m.confidence,
        'last_verified_at', m.last_verified_at
      ) ORDER BY m.created_at)
      FROM public.buyer_contact_enrichment_emails m
      WHERE m.buyer_contact_id = _buyer_contact_id
    ), '[]'::jsonb),
    'evidence', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'field_name', v.field_name,
        'field_value', v.field_value,
        'source_url', v.source_url,
        'confidence', v.confidence
      ))
      FROM public.buyer_contact_enrichment_evidence v
      WHERE v.buyer_contact_id = _buyer_contact_id
    ), '[]'::jsonb)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_importer_profile(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_importer_profile(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_importer_profile(uuid) TO authenticated;