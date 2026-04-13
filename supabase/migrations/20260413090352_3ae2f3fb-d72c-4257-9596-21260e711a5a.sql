
CREATE OR REPLACE FUNCTION public.compute_full_address()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.full_address := COALESCE(
    NULLIF(CONCAT_WS(', ',
      NULLIF(TRIM(NEW.street), ''),
      NULLIF(TRIM(NEW.postal_code), ''),
      NULLIF(TRIM(NEW.city), ''),
      NULLIF(TRIM(NEW.country), '')
    ), ''),
    NULLIF(TRIM(NEW."Address"), '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_compute_full_address
BEFORE INSERT OR UPDATE ON public.buyer_contacts
FOR EACH ROW
EXECUTE FUNCTION public.compute_full_address();
