ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS samples_sent_at date,
  ADD COLUMN IF NOT EXISTS order_won boolean,
  ADD COLUMN IF NOT EXISTS order_amount numeric,
  ADD COLUMN IF NOT EXISTS order_details text,
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS next_action_at date;

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.search_buyer_contacts(_countries text[], _q text, _offset integer, _limit integer)
RETURNS TABLE(row_data jsonb, total_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, extensions
AS $$
  WITH f AS (
    SELECT b.* FROM public.buyer_contacts b
    WHERE b.country = ANY(_countries)
      AND (
        coalesce(trim(_q),'') = ''
        OR extensions.unaccent(lower(coalesce(b.company_name,''))) LIKE '%' || extensions.unaccent(lower(trim(_q))) || '%'
        OR extensions.unaccent(lower(coalesce(b.city,''))) LIKE '%' || extensions.unaccent(lower(trim(_q))) || '%'
        OR extensions.unaccent(lower(coalesce(b.email,''))) LIKE '%' || extensions.unaccent(lower(trim(_q))) || '%'
        OR extensions.unaccent(lower(coalesce(b.full_address,''))) LIKE '%' || extensions.unaccent(lower(trim(_q))) || '%'
      )
  )
  SELECT to_jsonb(f.*), count(*) OVER () FROM f
  ORDER BY f.company_name ASC NULLS LAST
  OFFSET greatest(_offset,0) LIMIT least(greatest(_limit,1),100);
$$;

GRANT EXECUTE ON FUNCTION public.search_buyer_contacts(text[], text, integer, integer) TO authenticated;