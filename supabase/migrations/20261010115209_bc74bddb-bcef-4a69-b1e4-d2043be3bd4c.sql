ALTER TABLE public.admin_invitations
  ADD COLUMN IF NOT EXISTS invitation_type text NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS domain_name text,
  ADD COLUMN IF NOT EXISTS mission_name text,
  ADD COLUMN IF NOT EXISTS imported_count integer;

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE is_invited boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.admin_invitations
    WHERE lower(email) = lower(NEW.email) AND status = 'sent' AND invitation_type = 'classic'
  ) INTO is_invited;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN is_invited THEN 'paid'::public.app_role ELSE 'free'::public.app_role END)
  ON CONFLICT (user_id) DO NOTHING;

  IF is_invited THEN
    UPDATE public.profiles SET subscription_plan = 'paid' WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END; $function$;