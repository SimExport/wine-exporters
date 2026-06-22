ALTER TABLE public.user_credits ADD COLUMN IF NOT EXISTS export_credits integer NOT NULL DEFAULT 500;

UPDATE public.user_credits SET export_credits = 500 WHERE export_credits IS NULL OR export_credits = 0;

CREATE OR REPLACE FUNCTION public.consume_export_credits(_count integer)
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

  IF _count IS NULL OR _count <= 0 THEN
    RAISE EXCEPTION 'Invalid count';
  END IF;

  UPDATE public.user_credits
  SET export_credits = export_credits - _count,
      updated_at = now()
  WHERE user_id = auth.uid()
    AND export_credits >= _count
  RETURNING export_credits INTO remaining;

  IF remaining IS NULL THEN
    RETURN -1;
  END IF;

  RETURN remaining;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_export_credits_reset()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.user_credits
  SET export_credits = 500,
      next_reset_date = (CURRENT_DATE + INTERVAL '1 month')::date,
      updated_at = now()
  WHERE user_id = auth.uid()
    AND (next_reset_date IS NULL OR CURRENT_DATE >= next_reset_date);
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_export_credits(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_export_credits_reset() TO authenticated;