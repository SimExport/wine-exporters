-- Create buyer_contacts table for the importers database
CREATE TABLE public.buyer_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_first_name TEXT NOT NULL,
  contact_last_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Importateur', 'Distributeur', 'Caviste', 'Horeca')),
  country TEXT NOT NULL,
  email TEXT NOT NULL,
  website_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.buyer_contacts ENABLE ROW LEVEL SECURITY;

-- Create policies - make buyer contacts viewable by authenticated users
CREATE POLICY "Authenticated users can view buyer contacts" 
ON public.buyer_contacts 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Add indexes for performance
CREATE INDEX idx_buyer_contacts_country ON public.buyer_contacts(country);
CREATE INDEX idx_buyer_contacts_company_name ON public.buyer_contacts(company_name);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_buyer_contacts_updated_at
BEFORE UPDATE ON public.buyer_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO public.buyer_contacts (company_name, contact_first_name, contact_last_name, type, country, email, website_url) VALUES
('Wine Import Deutschland GmbH', 'Hans', 'Mueller', 'Importateur', 'DE', 'hans.mueller@wineimport-de.com', 'https://wineimport-de.com'),
('British Wine Co', 'James', 'Smith', 'Distributeur', 'UK', 'james.smith@britishwine.co.uk', 'https://britishwine.co.uk'),
('Weinhandel Schmidt', 'Klaus', 'Schmidt', 'Caviste', 'DE', 'klaus@weinhandel-schmidt.de', null),
('Restaurant Le Gourmet', 'Pierre', 'Dubois', 'Horeca', 'BE', 'pierre@legourmet.be', 'https://legourmet.be'),
('Nordic Wine Import', 'Lars', 'Andersen', 'Importateur', 'DK', 'lars@nordicwine.dk', 'https://nordicwine.dk'),
('Vinos Españoles SA', 'Carlos', 'Rodriguez', 'Distributeur', 'ES', 'carlos@vinosesp.es', 'https://vinosesp.es'),
('Swiss Wine Trading', 'Marco', 'Bianchi', 'Importateur', 'CH', 'marco@swisswine.ch', 'https://swisswine.ch'),
('Tokyo Wine House', 'Hiroshi', 'Tanaka', 'Caviste', 'JP', 'hiroshi@tokyowine.jp', 'https://tokyowine.jp'),
('America Wine Import', 'John', 'Davis', 'Importateur', 'US', 'john@americawine.com', 'https://americawine.com'),
('Pasta & Vino', 'Giuseppe', 'Rossi', 'Horeca', 'IT', 'giuseppe@pastavino.it', null);