ALTER TABLE public.campaign_result_jobs ADD COLUMN sync_process_id text, ADD COLUMN sync_emails jsonb;
CREATE TABLE public.campaign_result_operation_locks(campaign_id uuid PRIMARY KEY REFERENCES public.campaigns(id), token uuid NOT NULL DEFAULT gen_random_uuid(), expires_at timestamptz NOT NULL DEFAULT now()+interval '4 minutes', created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.campaign_result_operation_locks TO service_role;
ALTER TABLE public.campaign_result_operation_locks ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.claim_campaign_result_operation(_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t uuid;
BEGIN
 INSERT INTO public.campaign_result_operation_locks(campaign_id) VALUES(_id) ON CONFLICT(campaign_id) DO UPDATE SET token=gen_random_uuid(),expires_at=now()+interval '4 minutes' WHERE campaign_result_operation_locks.expires_at<now() RETURNING token INTO t; RETURN t;
END; $$;
REVOKE ALL ON FUNCTION public.claim_campaign_result_operation(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_campaign_result_operation(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.release_campaign_result_operation(_id uuid,_token uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ DELETE FROM public.campaign_result_operation_locks WHERE campaign_id=_id AND token=_token; $$;
REVOKE ALL ON FUNCTION public.release_campaign_result_operation(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.release_campaign_result_operation(uuid,uuid) TO service_role;