-- Extend campaigns table for wizard functionality
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS 
  channels TEXT[] DEFAULT '{}',
  segments TEXT[] DEFAULT '{}',
  volume_band TEXT,
  price_min NUMERIC,
  price_max NUMERIC,
  language TEXT DEFAULT 'FR',
  exclude_recent_days INTEGER DEFAULT 90,
  blacklist_buyer_ids TEXT[] DEFAULT '{}',
  cuvees TEXT[] DEFAULT '{}',
  doc_presentation UUID REFERENCES public.documents(id),
  doc_pricelist UUID REFERENCES public.documents(id),
  doc_techs UUID[] DEFAULT '{}',
  techs_link TEXT,
  send_as_name TEXT,
  reply_to TEXT,
  subject_variants TEXT[] DEFAULT '{}',
  subject_selected TEXT,
  message_html TEXT,
  message_text TEXT,
  sequence_enabled BOOLEAN DEFAULT true,
  seq2_delay_days INTEGER DEFAULT 3,
  seq3_delay_days INTEGER DEFAULT 10,
  schedule_at TIMESTAMP WITH TIME ZONE,
  send_now BOOLEAN DEFAULT false,
  daily_cap INTEGER DEFAULT 200,
  managed_by_bo BOOLEAN DEFAULT false,
  audience_estimate INTEGER DEFAULT 0,
  stats_opens INTEGER DEFAULT 0,
  stats_clicks INTEGER DEFAULT 0,
  stats_replies INTEGER DEFAULT 0,
  stats_bounces INTEGER DEFAULT 0;

-- Create campaign_events table
CREATE TABLE IF NOT EXISTS public.campaign_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for campaign_events
ALTER TABLE public.campaign_events ENABLE ROW LEVEL SECURITY;

-- Create policies for campaign_events
CREATE POLICY "Users can view their campaign events" 
ON public.campaign_events 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.campaigns 
  WHERE campaigns.id = campaign_events.campaign_id 
  AND campaigns.user_id = auth.uid()
));

CREATE POLICY "System can create campaign events" 
ON public.campaign_events 
FOR INSERT 
WITH CHECK (true);

-- Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  buyer_id TEXT NOT NULL,
  market TEXT NOT NULL,
  message_snippet TEXT,
  status TEXT DEFAULT 'new',
  owner_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create policies for leads
CREATE POLICY "Users can view their leads" 
ON public.leads 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.campaigns 
  WHERE campaigns.id = leads.campaign_id 
  AND campaigns.user_id = auth.uid()
));

CREATE POLICY "Users can update their leads" 
ON public.leads 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.campaigns 
  WHERE campaigns.id = leads.campaign_id 
  AND campaigns.user_id = auth.uid()
));

CREATE POLICY "System can create leads" 
ON public.leads 
FOR INSERT 
WITH CHECK (true);

-- Add trigger for leads updated_at
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();