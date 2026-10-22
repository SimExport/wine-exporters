CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT 'null'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.app_settings TO authenticated;
GRANT INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert settings" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update settings" ON public.app_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.app_settings(key, value) VALUES ('campaign_email_editor_enabled', 'false'::jsonb);

CREATE OR REPLACE FUNCTION public.has_campaign_editor_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.has_role(_user_id,'admin')
    OR coalesce((SELECT value = 'true'::jsonb FROM public.app_settings WHERE key='campaign_email_editor_enabled'), false)
    OR EXISTS (SELECT 1 FROM public.user_entitlements
      WHERE user_id=_user_id AND entitlement='campaign_email_editor' AND status='active'
        AND (expires_at IS NULL OR expires_at > now()));
$$;

CREATE OR REPLACE FUNCTION public.submit_campaign(_id uuid)
 RETURNS campaigns LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE c public.campaigns; uid uuid := auth.uid(); is_admin boolean; has_html boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO c FROM public.campaigns WHERE id = _id FOR UPDATE;
  IF c.id IS NULL OR c.user_id <> uid THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
  IF c.status <> 'draft' THEN RAISE EXCEPTION 'Campaign is not a draft' USING ERRCODE='P0001'; END IF;
  has_html := length(trim(coalesce(c.message_html,''))) > 0;
  -- New path: anyone with editor access (admin, entitlement or general rollout) must submit a prepared email.
  IF public.has_campaign_editor_access(uid) AND NOT has_html THEN
    RAISE EXCEPTION 'Email must be prepared before submission' USING ERRCODE='P0001';
  END IF;
  IF has_html THEN
    IF coalesce((c.email_content->>'version')::int, 0) <> 2
       OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(c.email_content->'blocks','[]'::jsonb)) b
                      WHERE b->>'type' IN ('text','heading') AND length(trim(regexp_replace(coalesce(b->>'html',''),'<[^>]*>','','g'))) > 0) THEN
      RAISE EXCEPTION 'Email content is invalid' USING ERRCODE='P0001';
    END IF;
    IF NOT public.campaign_html_is_valid(c.message_html, c.id) THEN
      RAISE EXCEPTION 'Email is missing required Brevo tags or interest link' USING ERRCODE='P0001';
    END IF;
    IF position('{{ contact.COMPANY_NAME }}' in coalesce(c.subject_selected,'')) = 0 THEN
      RAISE EXCEPTION 'Subject must contain {{ contact.COMPANY_NAME }}' USING ERRCODE='P0001';
    END IF;
  END IF;
  is_admin := public.has_role(uid, 'admin');
  PERFORM set_config('app.campaign_rpc', 'on', true);
  IF c.credit_consumed_at IS NULL AND NOT is_admin THEN
    IF public.is_exportvins_trial_user(uid) THEN RAISE EXCEPTION 'No campaign credit' USING ERRCODE='P0002'; END IF;
    UPDATE public.user_credits SET campaign_credits = campaign_credits - 1, updated_at = now()
     WHERE user_id = uid AND campaign_credits > 0;
    IF NOT FOUND THEN RAISE EXCEPTION 'No campaign credit' USING ERRCODE='P0002'; END IF;
    UPDATE public.campaigns SET credit_consumed_at = now() WHERE id = _id;
  END IF;
  UPDATE public.campaigns SET status = 'pending_validation', validation_requested_at = now()
   WHERE id = _id RETURNING * INTO c;
  PERFORM set_config('app.campaign_rpc', 'off', true);
  RETURN c;
END; $function$;

CREATE OR REPLACE FUNCTION public.reject_campaign(_id uuid, _reason text)
 RETURNS campaigns LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE c public.campaigns;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
  IF length(trim(coalesce(_reason,''))) = 0 THEN RAISE EXCEPTION 'A reason is required' USING ERRCODE='P0001'; END IF;
  -- Credit stays consumed (credit_consumed_at kept); producer instructions (client_note) are never overwritten.
  UPDATE public.campaigns SET status = 'draft', admin_reviewer = auth.uid()
   WHERE id = _id AND status = 'pending_validation' AND brevo_campaign_id IS NULL AND send_started_at IS NULL
  RETURNING * INTO c;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Campaign cannot be rejected' USING ERRCODE='P0001'; END IF;
  INSERT INTO public.campaign_events(campaign_id, type, payload)
  VALUES (_id, 'rejected', jsonb_build_object('reason', left(trim(_reason), 2000), 'by', auth.uid()));
  RETURN c;
END; $function$;

CREATE OR REPLACE FUNCTION public.is_test_campaign(_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.campaign_events WHERE campaign_id=_id AND type='test_campaign');
$$;
REVOKE ALL ON FUNCTION public.is_test_campaign(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_test_campaign(uuid) TO authenticated, service_role;