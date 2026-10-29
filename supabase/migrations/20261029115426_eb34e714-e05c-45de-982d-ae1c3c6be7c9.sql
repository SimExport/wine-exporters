CREATE OR REPLACE FUNCTION public.get_campaign_queue_secret() RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='campaign_send_queue_internal' $$;
REVOKE ALL ON FUNCTION public.get_campaign_queue_secret() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_campaign_queue_secret() TO service_role;