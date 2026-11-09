-- lovable-cron-fallback-reviewed: stalled/silent workers emit no event; time-based detection required, user asked for 5-10 min cadence
CREATE TABLE public.system_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key text NOT NULL,
  source text NOT NULL,
  category text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('warning','blocking')),
  human_title text NOT NULL,
  human_message text NOT NULL,
  technical_message text,
  resource_type text,
  resource_id uuid,
  resource_name text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  occurrences integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  alert_state text NOT NULL DEFAULT 'none' CHECK (alert_state IN ('none','pending','sending','sent','failed','uncertain')),
  alert_attempts integer NOT NULL DEFAULT 0,
  alert_sent_at timestamptz,
  alert_error text,
  resolved_alert_state text NOT NULL DEFAULT 'none' CHECK (resolved_alert_state IN ('none','pending','sending','sent','failed','uncertain')),
  resolved_alert_attempts integer NOT NULL DEFAULT 0,
  resolved_alert_sent_at timestamptz,
  resolved_alert_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_incidents TO authenticated;
GRANT ALL ON public.system_incidents TO service_role;
ALTER TABLE public.system_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read system incidents" ON public.system_incidents FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE UNIQUE INDEX system_incidents_open_key ON public.system_incidents(dedupe_key) WHERE status='open';
CREATE INDEX system_incidents_recent ON public.system_incidents(last_seen_at DESC);
CREATE TRIGGER update_system_incidents_updated_at BEFORE UPDATE ON public.system_incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Atomic dedupe: one open row per key; repeated detections only bump last_seen/occurrences.
CREATE OR REPLACE FUNCTION public.record_system_incident(_key text,_source text,_category text,_severity text,_title text,_message text,_technical text,_resource_type text,_resource_id uuid,_resource_name text)
RETURNS TABLE(id uuid, inserted boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.system_incidents AS s(dedupe_key,source,category,severity,human_title,human_message,technical_message,resource_type,resource_id,resource_name,alert_state)
  VALUES(_key,_source,_category,_severity,_title,_message,left(_technical,500),_resource_type,_resource_id,_resource_name,CASE WHEN _severity='blocking' THEN 'pending' ELSE 'none' END)
  ON CONFLICT (dedupe_key) WHERE status='open' DO UPDATE SET
    last_seen_at=now(), occurrences=s.occurrences+1,
    technical_message=EXCLUDED.technical_message, human_message=EXCLUDED.human_message,
    severity=CASE WHEN EXCLUDED.severity='blocking' THEN 'blocking' ELSE s.severity END,
    alert_state=CASE WHEN EXCLUDED.severity='blocking' AND s.alert_state='none' THEN 'pending' ELSE s.alert_state END
  RETURNING s.id, (xmax = 0);
END $$;
REVOKE ALL ON FUNCTION public.record_system_incident(text,text,text,text,text,text,text,text,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_system_incident(text,text,text,text,text,text,text,text,uuid,text) TO service_role;

INSERT INTO public.system_incidents(dedupe_key,source,category,severity,human_title,human_message,technical_message,resource_type,resource_id,resource_name,status,first_seen_at,last_seen_at,resolved_at,alert_state,resolved_alert_state)
VALUES('results:6d6e6a56-4cbf-46a5-bbae-738c2b2bb5e6:paused:historic','campaign_results','Résultats de campagne','blocking',
 'Champagne Didier LANGRY — résultats bloqués dans Brevo',
 'La récupération des résultats de la campagne « octobre 2026 2 » s''est arrêtée après le nombre maximal de tentatives. Corrigé le 9 novembre 2026 ; la campagne affiche ses résultats.',
 'Invocation budget exhausted (180 hops). Corrigé par process-campaign-results v13 (skipped === true). Heure exacte du blocage non conservée ; date du 8/11/2026 rapportée.',
 'campaign','6d6e6a56-4cbf-46a5-bbae-738c2b2bb5e6','octobre 2026 2','resolved',
 '2026-11-08 00:00:00+01','2026-11-09 08:45:27+00','2026-11-09 08:45:27+00','none','none');

CREATE OR REPLACE FUNCTION public.dispatch_system_monitor() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE k text;
BEGIN
  SELECT decrypted_secret INTO k FROM vault.decrypted_secrets WHERE name='campaign_results_internal';
  IF k IS NULL THEN RETURN; END IF;
  PERFORM net.http_post(url:='https://dmgafmigqfycyaopdviw.supabase.co/functions/v1/monitor-system-incidents',headers:=jsonb_build_object('Content-Type','application/json','x-campaign-results-secret',k),body:='{}'::jsonb,timeout_milliseconds:=60000);
END $$;
REVOKE ALL ON FUNCTION public.dispatch_system_monitor() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('system-health-monitor','*/10 * * * *','SELECT public.dispatch_system_monitor();');