
-- 1. Extend sourcing_requests
ALTER TABLE public.sourcing_requests
  ADD COLUMN IF NOT EXISTS result_file_url text,
  ADD COLUMN IF NOT EXISTS result_file_name text,
  ADD COLUMN IF NOT EXISTS result_file_size integer,
  ADD COLUMN IF NOT EXISTS result_file_format text,
  ADD COLUMN IF NOT EXISTS validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS validated_by uuid,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- status check (drop+add to be safe)
ALTER TABLE public.sourcing_requests
  DROP CONSTRAINT IF EXISTS sourcing_requests_status_check;
ALTER TABLE public.sourcing_requests
  ADD CONSTRAINT sourcing_requests_status_check
  CHECK (status IN ('pending','in_progress','validated','archived'));

-- updated_at trigger
DROP TRIGGER IF EXISTS update_sourcing_requests_updated_at ON public.sourcing_requests;
CREATE TRIGGER update_sourcing_requests_updated_at
BEFORE UPDATE ON public.sourcing_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Admin update/delete policies
DROP POLICY IF EXISTS "Admins can update sourcing requests" ON public.sourcing_requests;
CREATE POLICY "Admins can update sourcing requests"
ON public.sourcing_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete sourcing requests" ON public.sourcing_requests;
CREATE POLICY "Admins can delete sourcing requests"
ON public.sourcing_requests
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Storage bucket for results
INSERT INTO storage.buckets (id, name, public)
VALUES ('sourcing-results', 'sourcing-results', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Admins manage sourcing-results" ON storage.objects;
CREATE POLICY "Admins manage sourcing-results"
ON storage.objects
FOR ALL
USING (bucket_id = 'sourcing-results' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'sourcing-results' AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users read their sourcing results" ON storage.objects;
CREATE POLICY "Users read their sourcing results"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'sourcing-results'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
