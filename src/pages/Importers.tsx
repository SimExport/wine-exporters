import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink, Download, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BuyerContact {
  id: string;
  company_name: string;
  country: string;
  email: string;
  website_url?: string;
  street?: string;
  city?: string;
  postal_code?: string;
  phone?: string;
  state?: string;
  created_at: string;
  updated_at: string;
}

const COUNTRIES = [
  { code: 'DE', name: 'Allemagne', englishName: 'Germany' },
  { code: 'UK', name: 'Royaume-Uni', englishName: 'United Kingdom' },
  { code: 'DK', name: 'Danemark', englishName: 'Denmark' },
  { code: 'SE', name: 'Suède', englishName: 'Sweden' },
  { code: 'NO', name: 'Norvège', englishName: 'Norway' },
  { code: 'FI', name: 'Finlande', englishName: 'Finland' },
  { code: 'NL', name: 'Pays-Bas', englishName: 'Netherlands' },
  { code: 'BE', name: 'Belgique', englishName: 'Belgium' },
  { code: 'CH', name: 'Suisse', englishName: 'Switzerland' },
  { code: 'AT', name: 'Autriche', englishName: 'Austria' },
  { code: 'IT', name: 'Italie', englishName: 'Italy' },
  { code: 'ES', name: 'Espagne', englishName: 'Spain' },
  { code: 'PT', name: 'Portugal', englishName: 'Portugal' },
  { code: 'US', name: 'États-Unis', englishName: 'United States' },
  { code: 'CA', name: 'Canada', englishName: 'Canada' },
  { code: 'JP', name: 'Japon', englishName: 'Japan' },
  { code: 'KR', name: 'Corée du Sud', englishName: 'South Korea' },
  { code: 'HK', name: 'Hong Kong', englishName: 'Hong Kong' },
  { code: 'SG', name: 'Singapour', englishName: 'Singapore' },
  { code: 'AU', name: 'Australie', englishName: 'Australia' },
  { code: 'BR', name: 'Brésil', englishName: 'Brazil' },
  { code: 'MX', name: 'Mexique', englishName: 'Mexico' },
  { code: 'CN', name: 'Chine', englishName: 'China' },
  { code: 'EE', name: 'Estonie', englishName: 'Estonia' },
  { code: 'IE', name: 'Irlande', englishName: 'Ireland' },
  { code: 'PL', name: 'Pologne', englishName: 'Poland' },
  { code: 'CZ', name: 'République tchèque', englishName: 'Czech Republic' },
  { code: 'ZA', name: 'Afrique du Sud', englishName: 'South Africa' },
];

const Importers = () => {
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [contacts, setContacts] = useState<BuyerContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const { toast } = useToast();

  const fetchContacts = async (countryCode: string, page = 1, limit = 20) => {
    if (!countryCode) {
      setContacts([]);
      setTotalCount(0);
      return;
    }

    setLoading(true);
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Find the English name from the country code
      const country = COUNTRIES.find(c => c.code === countryCode);
      if (!country) {
        setContacts([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      const { data, error, count } = await supabase
        .from('buyer_contacts')
        .select('*', { count: 'exact' })
        .eq('country', country.englishName)
        .order('company_name', { ascending: true })
        .range(from, to);

      if (error) {
        console.error('Error fetching contacts:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les contacts',
          variant: 'destructive',
        });
        return;
      }

      setContacts(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchContacts(selectedCountry, 1, itemsPerPage);
  }, [selectedCountry, itemsPerPage]);

  useEffect(() => {
    fetchContacts(selectedCountry, currentPage, itemsPerPage);
  }, [currentPage]);

  const exportToCSV = async () => {
    if (!selectedCountry) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un pays',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Find the English name from the country code
      const country = COUNTRIES.find(c => c.code === selectedCountry);
      if (!country) return;

      const { data, error } = await supabase
        .from('buyer_contacts')
        .select('*')
        .eq('country', country.englishName)
        .order('company_name', { ascending: true })
        .limit(10000);

      if (error) {
        console.error('Error fetching data for export:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible d\'exporter les données',
          variant: 'destructive',
        });
        return;
      }

      // Create CSV content
      const headers = ['company_name', 'country', 'city', 'email', 'phone', 'website_url', 'street', 'postal_code', 'state'];
      const csvContent = [
        headers.join(','),
        ...(data || []).map(contact => 
          headers.map(header => {
            const value = contact[header as keyof BuyerContact] || '';
            return `"${value.toString().replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `contacts_${selectedCountry}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Succès',
        description: 'Export CSV téléchargé avec succès',
      });
    } catch (error) {
      console.error('Error during export:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur lors de l\'export',
        variant: 'destructive',
      });
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalCount);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="text-sm text-muted-foreground mb-2">
          Dashboard / Importers DB
        </div>
        <h1 className="text-3xl font-bold text-foreground">Base d'acheteurs par pays</h1>
        <p className="text-muted-foreground mt-2">
          Consultez les contacts importateurs disponibles et découvrez leurs informations essentielles.
        </p>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Choisir un marché" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedCountry && (
            <div className="text-sm text-muted-foreground">
              {totalCount} contacts
            </div>
          )}
        </div>
        
        <Button 
          onClick={exportToCSV} 
          disabled={!selectedCountry || totalCount === 0}
          variant="outline"
        >
          <Download className="h-4 w-4 mr-2" />
          Télécharger en CSV
        </Button>
      </div>

      {/* Main Content */}
      <Card>
        {!selectedCountry ? (
          <div className="p-12 text-center text-muted-foreground">
            Sélectionnez un pays pour afficher les contacts.
          </div>
        ) : loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Chargement...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            Aucun contact trouvé pour ce pays.
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom de la société</TableHead>
                    <TableHead>Pays</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Site web</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {contact.company_name}
                      </TableCell>
                      <TableCell>
                        {contact.country}
                      </TableCell>
                      <TableCell>
                        {contact.city || '-'}
                      </TableCell>
                      <TableCell>
                        <a 
                          href={`mailto:${contact.email}`}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </a>
                      </TableCell>
                      <TableCell>
                        {contact.phone || '-'}
                      </TableCell>
                      <TableCell>
                        {contact.website_url ? (
                          <a 
                            href={contact.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Ouvrir
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  {startItem} à {endItem} sur {totalCount}
                </div>
                <Select 
                  value={itemsPerPage.toString()} 
                  onValueChange={(value) => setItemsPerPage(Number(value))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20 par page</SelectItem>
                    <SelectItem value="50">50 par page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Précédent
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {currentPage} sur {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Suivant
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default Importers;