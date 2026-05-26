
-- 1. Clean duplicates: drop 'free' rows where the user also has 'paid' or 'admin'
DELETE FROM public.user_roles a
USING public.user_roles b
WHERE a.user_id = b.user_id
  AND a.role = 'free'
  AND b.role IN ('paid'::public.app_role, 'admin'::public.app_role);

-- 2. Replace constraint: one role per user
ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_unique;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);

-- 3. Trigger: invited users come in as 'paid'
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_invited boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.admin_invitations
    WHERE lower(email) = lower(NEW.email)
      AND status = 'sent'
  ) INTO is_invited;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE WHEN is_invited THEN 'paid'::public.app_role
         ELSE 'free'::public.app_role END
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
