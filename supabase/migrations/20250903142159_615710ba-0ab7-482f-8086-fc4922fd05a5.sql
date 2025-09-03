-- Create user roles system
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update campaigns table to allow admin access
DROP POLICY IF EXISTS "Users can view their own campaigns" ON public.campaigns;
CREATE POLICY "Users can view their own campaigns or admins can view all"
ON public.campaigns
FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Update leads table to allow admin access
DROP POLICY IF EXISTS "Users can view their leads" ON public.leads;
CREATE POLICY "Users can view their leads or admins can view all"
ON public.leads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = leads.campaign_id 
    AND campaigns.user_id = auth.uid()
  ) 
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Users can update their leads" ON public.leads;
CREATE POLICY "Users can update their leads or admins can update all"
ON public.leads
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = leads.campaign_id 
    AND campaigns.user_id = auth.uid()
  ) 
  OR public.has_role(auth.uid(), 'admin')
);

-- Allow admins to create leads for any campaign
CREATE POLICY "Admins can create leads for any campaign"
ON public.leads
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to create prospect notes
CREATE POLICY "Admins can create notes for any prospect"
ON public.prospect_notes
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = user_id);

-- Allow admins to view all prospect notes
DROP POLICY IF EXISTS "Users can view their prospect notes" ON public.prospect_notes;
CREATE POLICY "Users can view their prospect notes or admins can view all"
ON public.prospect_notes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM leads l
    JOIN campaigns c ON c.id = l.campaign_id
    WHERE l.id = prospect_notes.lead_id 
    AND c.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Allow admins to create/update/view sample items
CREATE POLICY "Admins can create sample items for any lead"
ON public.sample_items
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view their sample items" ON public.sample_items;
CREATE POLICY "Users can view their sample items or admins can view all"
ON public.sample_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM leads l
    JOIN campaigns c ON c.id = l.campaign_id
    WHERE l.id = sample_items.lead_id 
    AND c.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Users can update their sample items" ON public.sample_items;
CREATE POLICY "Users can update their sample items or admins can update all"
ON public.sample_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM leads l
    JOIN campaigns c ON c.id = l.campaign_id
    WHERE l.id = sample_items.lead_id 
    AND c.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Users can delete their sample items" ON public.sample_items;
CREATE POLICY "Users can delete their sample items or admins can delete all"
ON public.sample_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM leads l
    JOIN campaigns c ON c.id = l.campaign_id
    WHERE l.id = sample_items.lead_id 
    AND c.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);