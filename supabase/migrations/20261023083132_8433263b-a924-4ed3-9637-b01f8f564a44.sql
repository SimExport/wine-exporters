CREATE TABLE public.opportunity_archives (
 user_id uuid NOT NULL DEFAULT auth.uid(),
 opportunity_type text NOT NULL CHECK (opportunity_type IN ('importer', 'tender')),
 opportunity_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id, opportunity_type, opportunity_id)
);
GRANT SELECT, INSERT, DELETE ON public.opportunity_archives TO authenticated;
GRANT ALL ON public.opportunity_archives TO service_role;
ALTER TABLE public.opportunity_archives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own opportunity archives" ON public.opportunity_archives FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Archive accessible opportunities for self" ON public.opportunity_archives FOR INSERT TO authenticated WITH CHECK (
 user_id = (SELECT auth.uid()) AND (
  (opportunity_type = 'importer' AND EXISTS (SELECT 1 FROM public.importer_requests r WHERE r.id = opportunity_id AND r.status = 'published')) OR
  (opportunity_type = 'tender' AND EXISTS (SELECT 1 FROM public.tender_requests t WHERE t.id = opportunity_id AND t.status = 'published'))
 )
);
CREATE POLICY "Restore own opportunity archives" ON public.opportunity_archives FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));