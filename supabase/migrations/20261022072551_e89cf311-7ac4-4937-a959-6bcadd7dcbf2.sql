ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS email_content jsonb,
  ADD COLUMN IF NOT EXISTS credit_consumed_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_generation_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS send_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS send_error text;

-- Campaigns already submitted have already been charged.
UPDATE public.campaigns SET credit_consumed_at = validation_requested_at
WHERE credit_consumed_at IS NULL AND validation_requested_at IS NOT NULL
  AND status NOT IN ('draft','manual');

CREATE OR REPLACE FUNCTION public.campaigns_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sensitive text[] := ARRAY['status','validated_at','admin_reviewer','brevo_campaign_id','launched_at',
    'stats_opens','stats_clicks','stats_replies','stats_bounces','credit_consumed_at','send_started_at',
    'send_error','email_generated_at','email_generation_count','validation_requested_at'];
  k text;
BEGIN
  -- Exempt: service role / server contexts, admins, and trusted RPCs.
  IF auth.uid() IS NULL OR coalesce(auth.jwt()->>'role','') = 'service_role'
     OR current_setting('app.campaign_rpc', true) = 'on'
     OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('draft','manual') THEN
      RAISE EXCEPTION 'Campaigns must be created as draft' USING ERRCODE = '42501';
    END IF;
    IF NEW.validated_at IS NOT NULL OR NEW.admin_reviewer IS NOT NULL OR NEW.brevo_campaign_id IS NOT NULL
       OR NEW.launched_at IS NOT NULL OR NEW.credit_consumed_at IS NOT NULL OR NEW.send_started_at IS NOT NULL
       OR NEW.send_error IS NOT NULL OR NEW.email_generated_at IS NOT NULL OR coalesce(NEW.email_generation_count,0) <> 0
       OR NEW.validation_requested_at IS NOT NULL
       OR coalesce(NEW.stats_opens,0) <> 0 OR coalesce(NEW.stats_clicks,0) <> 0
       OR coalesce(NEW.stats_replies,0) <> 0 OR coalesce(NEW.stats_bounces,0) <> 0 THEN
      RAISE EXCEPTION 'Protected campaign fields' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- Archiving: allowed from any status except pending_validation, nothing else may change.
  IF NEW.status = 'archived' AND OLD.status <> 'archived' THEN
    IF OLD.status = 'pending_validation' THEN
      RAISE EXCEPTION 'Campaign under review cannot be archived' USING ERRCODE = '42501';
    END IF;
    IF (to_jsonb(NEW) - 'status' - 'updated_at') <> (to_jsonb(OLD) - 'status' - 'updated_at') THEN
      RAISE EXCEPTION 'Only the status can change when archiving' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  FOREACH k IN ARRAY sensitive LOOP
    IF (to_jsonb(NEW)->k) IS DISTINCT FROM (to_jsonb(OLD)->k) THEN
      RAISE EXCEPTION 'Protected campaign field: %', k USING ERRCODE = '42501';
    END IF;
  END LOOP;

  IF OLD.status <> 'draft' AND (to_jsonb(NEW) - 'updated_at') <> (to_jsonb(OLD) - 'updated_at') THEN
    RAISE EXCEPTION 'Only draft campaigns can be edited' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.campaigns_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS campaigns_guard ON public.campaigns;
CREATE TRIGGER campaigns_guard BEFORE INSERT OR UPDATE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.campaigns_guard();

CREATE OR REPLACE FUNCTION public.campaign_html_is_valid(_html text, _campaign_id uuid)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT position('{{ unsubscribe }}' in _html) > 0
     AND position('{{ mirror }}' in _html) > 0
     AND position(('/interest/' || _campaign_id::text) in _html) > 0;
$$;

CREATE OR REPLACE FUNCTION public.submit_campaign(_id uuid)
RETURNS public.campaigns LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.campaigns; uid uuid := auth.uid(); is_admin boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO c FROM public.campaigns WHERE id = _id FOR UPDATE;
  IF c.id IS NULL OR c.user_id <> uid THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
  IF c.status <> 'draft' THEN RAISE EXCEPTION 'Campaign is not a draft' USING ERRCODE='P0001'; END IF;
  -- Transition: an empty HTML follows the current path (generated at admin validation).
  IF length(trim(coalesce(c.message_html,''))) > 0 THEN
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
END; $$;

CREATE OR REPLACE FUNCTION public.save_campaign_email(_id uuid, _subject text, _content jsonb, _html text)
RETURNS public.campaigns LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.campaigns;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  IF length(coalesce(_html,'')) > 200000 OR length(coalesce(_content::text,'')) > 100000
     OR length(coalesce(_subject,'')) > 300 THEN
    RAISE EXCEPTION 'Email content too large' USING ERRCODE='P0001';
  END IF;
  UPDATE public.campaigns SET subject_selected = _subject, email_content = _content, message_html = _html
   WHERE id = _id AND user_id = auth.uid() AND status = 'draft' RETURNING * INTO c;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Campaign not editable' USING ERRCODE='42501'; END IF;
  RETURN c;
END; $$;

CREATE OR REPLACE FUNCTION public.reject_campaign(_id uuid, _reason text)
RETURNS public.campaigns LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.campaigns;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
  -- Credit stays consumed (credit_consumed_at kept): resubmission is free.
  UPDATE public.campaigns SET status = 'draft', admin_reviewer = auth.uid(),
         client_note = coalesce(nullif(trim(_reason),''), client_note)
   WHERE id = _id AND status = 'pending_validation' AND brevo_campaign_id IS NULL AND send_started_at IS NULL
  RETURNING * INTO c;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Campaign cannot be rejected' USING ERRCODE='P0001'; END IF;
  RETURN c;
END; $$;

REVOKE ALL ON FUNCTION public.submit_campaign(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_campaign_email(uuid, text, jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_campaign(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_campaign(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_campaign_email(uuid, text, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_campaign(uuid, text) TO authenticated;