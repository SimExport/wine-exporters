
-- 1. Update trigger to also set subscription_plan on profiles for invited users
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

  IF is_invited THEN
    UPDATE public.profiles
    SET subscription_plan = 'paid'
    WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Backfill existing 'paid' role users whose profile is still 'none'
UPDATE public.profiles p
SET subscription_plan = 'paid'
FROM public.user_roles ur
WHERE ur.user_id = p.user_id
  AND ur.role = 'paid'::public.app_role
  AND (p.subscription_plan IS NULL OR p.subscription_plan = 'none');
