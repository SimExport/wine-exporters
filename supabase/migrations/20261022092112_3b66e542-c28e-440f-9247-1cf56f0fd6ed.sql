CREATE OR REPLACE FUNCTION public.campaigns_guard()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  sensitive text[] := ARRAY['status','validated_at','admin_reviewer','brevo_campaign_id','launched_at',
    'stats_opens','stats_clicks','stats_replies','stats_bounces','credit_consumed_at','send_started_at',
    'send_error','email_generated_at','email_generation_count','validation_requested_at',
    -- Lot C: the email is written only server-side by save-campaign-email (service_role).
    'message_html','email_content','subject_selected'];
  k text;
BEGIN
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
       OR NEW.email_content IS NOT NULL OR coalesce(trim(NEW.message_html),'') <> ''
       OR coalesce(NEW.stats_opens,0) <> 0 OR coalesce(NEW.stats_clicks,0) <> 0
       OR coalesce(NEW.stats_replies,0) <> 0 OR coalesce(NEW.stats_bounces,0) <> 0 THEN
      RAISE EXCEPTION 'Protected campaign fields' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

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
END; $function$;