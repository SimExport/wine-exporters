ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_leads_archived_at ON public.leads(archived_at);

DROP POLICY IF EXISTS "Users can delete their leads" ON public.leads;
CREATE POLICY "Users can delete their leads"
ON public.leads
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.campaigns
  WHERE campaigns.id = leads.campaign_id
    AND campaigns.user_id = auth.uid()
));