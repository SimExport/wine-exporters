CREATE OR REPLACE FUNCTION public.get_users_emails_for_admin()
RETURNS TABLE(user_id uuid, email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email::text
  FROM auth.users u;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_users_emails_for_admin() TO authenticated;