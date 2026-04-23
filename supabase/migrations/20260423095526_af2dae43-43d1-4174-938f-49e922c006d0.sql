-- Auto-create user_credits row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_credits ON auth.users;
CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_credits();

-- Backfill credits for existing users
INSERT INTO public.user_credits (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_credits WHERE user_id IS NOT NULL)
ON CONFLICT DO NOTHING;

-- RPC: consume one campaign credit. Returns remaining count, or -1 if none available.
CREATE OR REPLACE FUNCTION public.consume_campaign_credit()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.user_credits
  SET campaign_credits = campaign_credits - 1,
      updated_at = now()
  WHERE user_id = auth.uid()
    AND campaign_credits > 0
  RETURNING campaign_credits INTO remaining;

  IF remaining IS NULL THEN
    RETURN -1;
  END IF;

  RETURN remaining;
END;
$$;

-- RPC: consume one search credit. Returns remaining count, or -1 if none available.
CREATE OR REPLACE FUNCTION public.consume_search_credit()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.user_credits
  SET search_credits = search_credits - 1,
      updated_at = now()
  WHERE user_id = auth.uid()
    AND search_credits > 0
  RETURNING search_credits INTO remaining;

  IF remaining IS NULL THEN
    RETURN -1;
  END IF;

  RETURN remaining;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_campaign_credit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_search_credit() TO authenticated;