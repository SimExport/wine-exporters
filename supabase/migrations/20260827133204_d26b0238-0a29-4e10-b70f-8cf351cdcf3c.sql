CREATE OR REPLACE FUNCTION public.admin_set_user_credits(
  _user_id uuid,
  _campaign integer,
  _search integer,
  _export integer
)
RETURNS public.user_credits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result public.user_credits;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF _campaign IS NULL OR _search IS NULL OR _export IS NULL
     OR _campaign < 0 OR _search < 0 OR _export < 0 THEN
    RAISE EXCEPTION 'Invalid credit values';
  END IF;

  UPDATE public.user_credits
  SET campaign_credits = _campaign,
      search_credits = _search,
      export_credits = _export,
      updated_at = now()
  WHERE user_id = _user_id
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    INSERT INTO public.user_credits (user_id, campaign_credits, search_credits, export_credits)
    VALUES (_user_id, _campaign, _search, _export)
    RETURNING * INTO result;
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_credits(uuid, integer, integer, integer) TO authenticated;