-- Create enums for prospect data
CREATE TYPE public.requested_action AS ENUM ('price_list', 'samples', 'video_call', 'tech_sheets', 'other');
CREATE TYPE public.prospect_status AS ENUM ('new', 'samples_requested', 'samples_sent', 'received', 'tasted', 'negotiation', 'won', 'lost');

-- Create sample_items table
CREATE TABLE public.sample_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  wine_id UUID REFERENCES public.wines(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notes table  
CREATE TABLE public.prospect_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to leads table to make it a full prospect system
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_name TEXT; 
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS requested_actions requested_action[];
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS requested_other TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS buyer_contact_id UUID REFERENCES public.buyer_contacts(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tally_response_id TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tally_response_url TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS prospect_status prospect_status DEFAULT 'new';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS estimated_amount DECIMAL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lost_reason TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS created_by UUID;

-- Enable RLS on new tables
ALTER TABLE public.sample_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sample_items 
CREATE POLICY "Users can view their sample items"
ON public.sample_items
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.leads l
  JOIN public.campaigns c ON c.id = l.campaign_id
  WHERE l.id = sample_items.lead_id AND c.user_id = auth.uid()
));

CREATE POLICY "Users can create sample items for their leads"
ON public.sample_items
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.leads l
  JOIN public.campaigns c ON c.id = l.campaign_id  
  WHERE l.id = sample_items.lead_id AND c.user_id = auth.uid()
));

CREATE POLICY "Users can update their sample items"
ON public.sample_items
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.leads l
  JOIN public.campaigns c ON c.id = l.campaign_id
  WHERE l.id = sample_items.lead_id AND c.user_id = auth.uid()
));

CREATE POLICY "Users can delete their sample items"
ON public.sample_items
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.leads l
  JOIN public.campaigns c ON c.id = l.campaign_id
  WHERE l.id = sample_items.lead_id AND c.user_id = auth.uid()
));

-- Create RLS policies for prospect_notes
CREATE POLICY "Users can view their prospect notes"
ON public.prospect_notes
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.leads l
  JOIN public.campaigns c ON c.id = l.campaign_id
  WHERE l.id = prospect_notes.lead_id AND c.user_id = auth.uid()
));

CREATE POLICY "Users can create notes for their prospects"
ON public.prospect_notes
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.leads l
  JOIN public.campaigns c ON c.id = l.campaign_id
  WHERE l.id = prospect_notes.lead_id AND c.user_id = auth.uid()
) AND auth.uid() = prospect_notes.user_id);

-- Create indexes for performance
CREATE INDEX idx_sample_items_lead_id ON public.sample_items(lead_id);
CREATE INDEX idx_prospect_notes_lead_id ON public.prospect_notes(lead_id);
CREATE INDEX idx_leads_campaign_email ON public.leads(campaign_id, email);
CREATE INDEX idx_leads_last_activity ON public.leads(last_activity_at DESC);
CREATE INDEX idx_leads_prospect_status ON public.leads(prospect_status);

-- Create triggers for updated_at
CREATE TRIGGER update_sample_items_updated_at
  BEFORE UPDATE ON public.sample_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update last_activity_at when leads are updated
CREATE OR REPLACE FUNCTION public.update_lead_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_leads_activity
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lead_activity();