
-- Add sourcing_requests_remaining column to profiles
ALTER TABLE public.profiles
ADD COLUMN sourcing_requests_remaining integer NOT NULL DEFAULT 1;

-- Create sourcing_requests table
CREATE TABLE public.sourcing_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_market text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_note text
);

-- Enable RLS
ALTER TABLE public.sourcing_requests ENABLE ROW LEVEL SECURITY;

-- Users can insert their own requests
CREATE POLICY "Users can insert their own sourcing requests"
ON public.sourcing_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own, admins can view all
CREATE POLICY "Users can view own sourcing requests or admins all"
ON public.sourcing_requests
FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
