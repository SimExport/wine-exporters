
ALTER TABLE public.importer_requests
  ADD COLUMN IF NOT EXISTS wine_styles_fr text,
  ADD COLUMN IF NOT EXISTS wine_styles_en text,
  ADD COLUMN IF NOT EXISTS volume_fr text,
  ADD COLUMN IF NOT EXISTS volume_en text,
  ADD COLUMN IF NOT EXISTS origins_fr text,
  ADD COLUMN IF NOT EXISTS origins_en text,
  ADD COLUMN IF NOT EXISTS requirements_fr text,
  ADD COLUMN IF NOT EXISTS requirements_en text;

ALTER TABLE public.tender_requests
  ADD COLUMN IF NOT EXISTS category_fr text,
  ADD COLUMN IF NOT EXISTS category_en text,
  ADD COLUMN IF NOT EXISTS available_volume_fr text,
  ADD COLUMN IF NOT EXISTS available_volume_en text,
  ADD COLUMN IF NOT EXISTS designation_origin_fr text,
  ADD COLUMN IF NOT EXISTS designation_origin_en text,
  ADD COLUMN IF NOT EXISTS style_profile_fr text,
  ADD COLUMN IF NOT EXISTS style_profile_en text,
  ADD COLUMN IF NOT EXISTS requirements_fr text,
  ADD COLUMN IF NOT EXISTS requirements_en text;
