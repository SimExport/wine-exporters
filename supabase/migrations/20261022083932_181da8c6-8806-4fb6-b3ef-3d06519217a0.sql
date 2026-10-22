CREATE OR REPLACE FUNCTION public.has_campaign_editor_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.has_role(_user_id,'admin') OR EXISTS (
    SELECT 1 FROM public.user_entitlements
    WHERE user_id=_user_id AND entitlement='campaign_email_editor' AND status='active'
      AND (expires_at IS NULL OR expires_at > now()));
$$;
REVOKE ALL ON FUNCTION public.has_campaign_editor_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_campaign_editor_access(uuid) TO authenticated, service_role;

-- Browser must never send final HTML: content is rendered server-side by save-campaign-email.
REVOKE EXECUTE ON FUNCTION public.save_campaign_email(uuid, text, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_campaign_email(uuid, text, jsonb, text) TO service_role;