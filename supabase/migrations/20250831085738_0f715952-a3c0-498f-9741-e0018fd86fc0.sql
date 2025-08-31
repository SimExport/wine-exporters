-- Create Wine model for cuvées management
CREATE TABLE public.wines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  appellation TEXT,
  grapes TEXT[],
  color TEXT NOT NULL,
  exw_price_eur DECIMAL(6,2) NOT NULL CHECK (exw_price_eur >= 0.10 AND exw_price_eur <= 999.99),
  organic BOOLEAN NOT NULL DEFAULT false,
  awards TEXT,
  vintages INTEGER[],
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wines ENABLE ROW LEVEL SECURITY;

-- Create policies for wine access
CREATE POLICY "Users can view their own wines" 
ON public.wines 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wines" 
ON public.wines 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wines" 
ON public.wines 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wines" 
ON public.wines 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_wines_updated_at
BEFORE UPDATE ON public.wines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add selected_wines field to campaigns table for integration
ALTER TABLE public.campaigns 
ADD COLUMN selected_wines UUID[];

-- Add related_wine field to documents table (optional)
ALTER TABLE public.documents 
ADD COLUMN related_wine UUID;

-- Create index for performance
CREATE INDEX idx_wines_user_id ON public.wines(user_id);
CREATE INDEX idx_wines_active ON public.wines(user_id, is_active);