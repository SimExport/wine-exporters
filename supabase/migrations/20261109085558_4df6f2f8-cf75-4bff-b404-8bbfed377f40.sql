REVOKE ALL ON public.system_incidents FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.system_incidents FROM authenticated;
GRANT SELECT ON public.system_incidents TO authenticated;
REVOKE ALL ON FUNCTION public.dispatch_system_monitor() FROM anon, authenticated;