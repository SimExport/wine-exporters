REVOKE ALL ON public.campaign_result_jobs FROM anon;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.campaign_result_jobs FROM authenticated;
REVOKE ALL ON public.campaign_result_operation_locks FROM anon,authenticated;
GRANT ALL ON public.campaign_result_jobs,public.campaign_result_operation_locks TO service_role;