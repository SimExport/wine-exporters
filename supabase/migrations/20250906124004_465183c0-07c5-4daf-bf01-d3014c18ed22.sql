-- Add new fields to profiles table for the updated profile form
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS certifications TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS wine_types TEXT[] DEFAULT '{}';

-- Add new fields to wines table for certifications
ALTER TABLE public.wines 
ADD COLUMN IF NOT EXISTS is_biodynamic BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_natural BOOLEAN DEFAULT false;