CREATE OR REPLACE FUNCTION public.get_my_campaign_send_slots()
RETURNS TABLE(campaign_id uuid, state text, scheduled_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  RETURN QUERY
  SELECT q.campaign_id, q.state, q.scheduled_at
  FROM public.campaign_send_queue q
  JOIN public.campaigns c ON c.id = q.campaign_id
  WHERE c.user_id = auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.get_my_campaign_send_slots() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_campaign_send_slots() TO authenticated;