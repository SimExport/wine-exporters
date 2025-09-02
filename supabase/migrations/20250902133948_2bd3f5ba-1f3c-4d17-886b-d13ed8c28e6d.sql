-- Fix search path for update_lead_activity function
CREATE OR REPLACE FUNCTION public.update_lead_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;