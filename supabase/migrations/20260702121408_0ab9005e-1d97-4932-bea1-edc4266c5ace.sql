
CREATE OR REPLACE FUNCTION public.get_campaign_public_info(_campaign_id uuid)
RETURNS TABLE(campaign_id uuid, campaign_name text, producer_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id AS campaign_id,
    c.name AS campaign_name,
    COALESCE(
      NULLIF(TRIM(p.domain_name), ''),
      NULLIF(TRIM(us.display_name), ''),
      NULLIF(TRIM(p.contact_name), ''),
      c.name
    ) AS producer_name
  FROM public.campaigns c
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  LEFT JOIN public.user_settings us ON us.user_id = c.user_id
  WHERE c.id = _campaign_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_public_info(uuid) TO anon, authenticated;
