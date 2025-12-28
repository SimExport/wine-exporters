-- Add new fields to profiles table for contact name and market preferences
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS contact_name text,
ADD COLUMN IF NOT EXISTS priority_markets text,
ADD COLUMN IF NOT EXISTS current_markets text,
ADD COLUMN IF NOT EXISTS avoid_markets text,
ADD COLUMN IF NOT EXISTS target_buyer_description text;