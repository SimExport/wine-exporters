CREATE TABLE public.user_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entitlement text NOT NULL DEFAULT 'exportvins_crm_trial',
  status text NOT NULL DEFAULT 'invited',
  mission_name text,
  invited_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  expires_at timestamptz,
  grace_ends_at timestamptz,
  discount_eligible boolean NOT NULL DEFAULT true,
  invited_by uuid,
  welcome_dismissed_at timestamptz,
  notified_d25_at timestamptz,
  notified_d30_at timestamptz,
  notified_d37_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entitlement)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_entitlements TO authenticated;
GRANT ALL ON public.user_entitlements TO service_role;
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own entitlements" ON public.user_entitlements FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage entitlements" ON public.user_entitlements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_user_entitlements_updated_at BEFORE UPDATE ON public.user_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS mission_name text, ADD COLUMN IF NOT EXISTS import_key text;
CREATE UNIQUE INDEX IF NOT EXISTS leads_campaign_import_key_uniq ON public.leads (campaign_id, import_key) WHERE import_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.has_premium_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id,'admin') OR public.has_role(_user_id,'paid')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id=_user_id AND subscription_plan IS NOT NULL AND subscription_plan <> 'none');
$$;

CREATE OR REPLACE FUNCTION public.crm_access_level(_user_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.user_entitlements;
BEGIN
  IF public.has_premium_access(_user_id) THEN RETURN 'full'; END IF;
  SELECT * INTO e FROM public.user_entitlements
   WHERE user_id=_user_id AND entitlement='exportvins_crm_trial' AND status IN ('active','expired');
  IF e.id IS NULL OR e.activated_at IS NULL THEN RETURN 'full'; END IF; -- unchanged behaviour
  IF now() < e.expires_at THEN RETURN 'trial'; END IF;
  IF now() < e.grace_ends_at THEN RETURN 'readonly'; END IF;
  RETURN 'none';
END; $$;

CREATE OR REPLACE FUNCTION public.is_exportvins_trial_user(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT public.has_premium_access(_user_id) AND EXISTS (
    SELECT 1 FROM public.user_entitlements WHERE user_id=_user_id
      AND entitlement='exportvins_crm_trial' AND status IN ('active','expired') AND activated_at IS NOT NULL);
$$;

CREATE OR REPLACE FUNCTION public.activate_exportvins_trial()
RETURNS public.user_entitlements LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.user_entitlements;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  IF public.has_premium_access(auth.uid()) THEN
    UPDATE public.user_entitlements SET status='converted' WHERE user_id=auth.uid() AND entitlement='exportvins_crm_trial' AND status IN ('invited','active','expired') RETURNING * INTO r;
    RETURN r;
  END IF;
  UPDATE public.user_entitlements
     SET status='active', activated_at=now(), expires_at=now()+interval '30 days', grace_ends_at=now()+interval '37 days'
   WHERE user_id=auth.uid() AND entitlement='exportvins_crm_trial' AND status='invited'
  RETURNING * INTO r;
  IF r.id IS NULL THEN
    SELECT * INTO r FROM public.user_entitlements WHERE user_id=auth.uid() AND entitlement='exportvins_crm_trial';
  END IF;
  RETURN r;
END; $$;

CREATE OR REPLACE FUNCTION public.dismiss_exportvins_welcome()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.user_entitlements SET welcome_dismissed_at=now() WHERE user_id=auth.uid() AND entitlement='exportvins_crm_trial';
$$;

-- Restrictive gates (only affect activated ExportVins trial accounts)
CREATE POLICY "Trial CRM read window" ON public.leads AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.crm_access_level(auth.uid()) <> 'none');
CREATE POLICY "Trial CRM write insert" ON public.leads AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.crm_access_level(auth.uid()) IN ('full','trial'));
CREATE POLICY "Trial CRM write update" ON public.leads AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.crm_access_level(auth.uid()) IN ('full','trial'));
CREATE POLICY "Trial CRM write delete" ON public.leads AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.crm_access_level(auth.uid()) IN ('full','trial'));
CREATE POLICY "Trial notes read" ON public.prospect_notes AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.crm_access_level(auth.uid()) <> 'none');
CREATE POLICY "Trial notes insert" ON public.prospect_notes AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.crm_access_level(auth.uid()) IN ('full','trial'));
CREATE POLICY "Trial notes update" ON public.prospect_notes AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.crm_access_level(auth.uid()) IN ('full','trial'));
CREATE POLICY "Trial notes delete" ON public.prospect_notes AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.crm_access_level(auth.uid()) IN ('full','trial'));
CREATE POLICY "Trial samples read" ON public.sample_items AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.crm_access_level(auth.uid()) <> 'none');
CREATE POLICY "Trial samples insert" ON public.sample_items AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.crm_access_level(auth.uid()) IN ('full','trial'));
CREATE POLICY "Trial samples update" ON public.sample_items AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.crm_access_level(auth.uid()) IN ('full','trial'));
CREATE POLICY "Trial samples delete" ON public.sample_items AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.crm_access_level(auth.uid()) IN ('full','trial'));

CREATE POLICY "Trial no opportunities" ON public.importer_requests AS RESTRICTIVE FOR SELECT TO authenticated
  USING (NOT public.is_exportvins_trial_user(auth.uid()));
CREATE POLICY "Trial no tenders" ON public.tender_requests AS RESTRICTIVE FOR SELECT TO authenticated
  USING (NOT public.is_exportvins_trial_user(auth.uid()));
CREATE POLICY "Trial no buyer contacts" ON public.buyer_contacts AS RESTRICTIVE FOR SELECT TO authenticated
  USING (NOT public.is_exportvins_trial_user(auth.uid()));

CREATE OR REPLACE FUNCTION public.consume_campaign_credit()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE remaining integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF public.is_exportvins_trial_user(auth.uid()) THEN RETURN -1; END IF;
  UPDATE public.user_credits SET campaign_credits = campaign_credits - 1, updated_at = now()
  WHERE user_id = auth.uid() AND campaign_credits > 0 RETURNING campaign_credits INTO remaining;
  IF remaining IS NULL THEN RETURN -1; END IF;
  RETURN remaining;
END; $function$;

CREATE OR REPLACE FUNCTION public.consume_search_credit()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE remaining integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF public.is_exportvins_trial_user(auth.uid()) THEN RETURN -1; END IF;
  UPDATE public.user_credits SET search_credits = search_credits - 1, updated_at = now()
  WHERE user_id = auth.uid() AND search_credits > 0 RETURNING search_credits INTO remaining;
  IF remaining IS NULL THEN RETURN -1; END IF;
  RETURN remaining;
END; $function$;

CREATE OR REPLACE FUNCTION public.consume_export_credits(_count integer)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE remaining integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _count IS NULL OR _count <= 0 THEN RAISE EXCEPTION 'Invalid count'; END IF;
  IF public.is_exportvins_trial_user(auth.uid()) THEN RETURN -1; END IF;
  UPDATE public.user_credits SET export_credits = export_credits - _count, updated_at = now()
  WHERE user_id = auth.uid() AND export_credits >= _count RETURNING export_credits INTO remaining;
  IF remaining IS NULL THEN RETURN -1; END IF;
  RETURN remaining;
END; $function$;