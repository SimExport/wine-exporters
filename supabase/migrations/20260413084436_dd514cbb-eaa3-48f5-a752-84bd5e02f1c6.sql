
-- Add full_address column if it doesn't exist
ALTER TABLE public.buyer_contacts ADD COLUMN IF NOT EXISTS full_address text;

-- Populate from structured fields (street, postal_code, city, country)
UPDATE public.buyer_contacts
SET full_address = CONCAT_WS(', ',
  NULLIF(TRIM(street), ''),
  NULLIF(TRIM(postal_code), ''),
  NULLIF(TRIM(city), ''),
  NULLIF(TRIM(country), '')
)
WHERE full_address IS NULL
  AND (street IS NOT NULL AND TRIM(street) != '')
  AND ("Address" IS NULL OR TRIM("Address") = '');

-- Fallback: copy legacy "Address" field
UPDATE public.buyer_contacts
SET full_address = "Address"
WHERE full_address IS NULL
  AND "Address" IS NOT NULL
  AND TRIM("Address") != '';
