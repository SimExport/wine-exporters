-- Allow all authenticated users to view all roadmap_votes (for global counters)
CREATE POLICY "Authenticated users can view all votes for counts"
ON public.roadmap_votes
FOR SELECT
USING (auth.uid() IS NOT NULL);