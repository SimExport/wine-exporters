-- 1. Create subscription_tier enum type
CREATE TYPE public.subscription_tier AS ENUM ('free', 'paid');

-- 2. Add subscription_tier column to profiles table (using existing subscription_plan logic)
-- We'll use the existing subscription_plan column and add a computed approach
-- First, let's create a helper function to check subscription status

CREATE OR REPLACE FUNCTION public.get_subscription_tier(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN subscription_plan IS NOT NULL AND subscription_plan != 'none' THEN 'paid'
      ELSE 'free'
    END
  FROM public.profiles
  WHERE user_id = _user_id
$$;

-- 3. Create helper function to check if user has paid subscription or is admin
CREATE OR REPLACE FUNCTION public.has_paid_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = _user_id 
    AND subscription_plan IS NOT NULL 
    AND subscription_plan != 'none'
  )
$$;

-- 4. Update simon@exportvins.fr to admin role
-- First, find the user_id from auth.users and insert into user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'simon@exportvins.fr'
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Drop existing RLS policy on buyer_contacts that allows all users
DROP POLICY IF EXISTS "Enable read access for all users" ON public.buyer_contacts;

-- 6. Create new RLS policy that restricts access to paid users and admins only
CREATE POLICY "Paid users and admins can view buyer contacts" 
ON public.buyer_contacts 
FOR SELECT 
USING (public.has_paid_access(auth.uid()));