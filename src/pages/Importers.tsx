import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CountrySelector, COUNTRIES as COUNTRY_LIST } from '@/components/importers/CountrySelector';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Mail, ChevronLeft, ChevronRight, Target, Loader2, Copy, Check, Facebook, Instagram, Linkedin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { PremiumOnlyState } from '@/components/PremiumOnlyState';
const CopyButton = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="ml-1 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
      title="Copier"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
};

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
  Address?: string;
  Facebook?: string;
  Instagram?: string;
  LinkedIn?: string;
  created_at: string;
  updated_at: string;
}

const formatAddress = (contact: BuyerContact): string => {
  const { street, city, postal_code, country, Address } = contact;
  if (street && city && postal_code) {
    return `${street}, ${postal_code} ${city}, ${translateCountry(country)}`;
  }
  if (city && country) {
    return `${city}, ${translateCountry(country)}`;
  }
  if (Address) {
    return Address;
  }
  return '—';
};

const COUNTRY_EN_TO_FR: Record<string, string> = {};
// Built lazily after COUNTRIES is defined below
const translateCountry = (englishName: string): string => {
  if (Object.keys(COUNTRY_EN_TO_FR).length === 0) {
    COUNTRIES.forEach(c => { COUNTRY_EN_TO_FR[c.englishName] = c.name; });
  }
  return COUNTRY_EN_TO_FR[englishName] || englishName;
};
const COUNTRIES = COUNTRY_LIST;
const Importers = () => {
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [contacts, setContacts] = useState<BuyerContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sourcingOpen, setSourcingOpen] = useState(false);
  const [sourcingMarket, setSourcingMarket] = useState('');
  const [sourcingLoading, setSourcingLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    hasPaidAccess,
    sourcingRequestsRemaining,
    refetch: refetchSubscription,
    loading: subscriptionLoading
  } = useSubscription();

  const handleSourcingSubmit = async () => {
    if (!user || !sourcingMarket || sourcingRequestsRemaining <= 0) return;
    setSourcingLoading(true);
    try {
      const { error: insertError } = await supabase
        .from('sourcing_requests')
        .insert({ user_id: user.id, target_market: sourcingMarket });
      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ sourcing_requests_remaining: sourcingRequestsRemaining - 1 })
        .eq('user_id', user.id);
      if (updateError) throw updateError;

      await refetchSubscription();
      setSourcingOpen(false);
      setSourcingMarket('');
      toast({ title: 'Demande reçue !', description: 'Notre équipe vous répondra sous 72h.' });
    } catch (error) {
      console.error('Sourcing request error:', error);
      toast({ title: 'Erreur', description: 'Impossible d\'envoyer la demande', variant: 'destructive' });
    } finally {
      setSourcingLoading(false);
    }
  };
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
      const {
        data,
        error,
        count
      } = await supabase.from('buyer_contacts').select('*', {
        count: 'exact'
      }).in('country', country.dbAliases).order('company_name', {
        ascending: true
      }).range(from, to);
      if (error) {
        console.error('Error fetching contacts:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les contacts',
          variant: 'destructive'
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
        variant: 'destructive'
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
        variant: 'destructive'
      });
      return;
    }
    try {
      // Find the English name from the country code
      const country = COUNTRIES.find(c => c.code === selectedCountry);
      if (!country) return;
      const {
        data,
        error
      } = await supabase.from('buyer_contacts').select('*').in('country', country.dbAliases).order('company_name', {
        ascending: true
      }).limit(10000);
      if (error) {
        console.error('Error fetching data for export:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible d\'exporter les données',
          variant: 'destructive'
        });
        return;
      }

      // Create CSV content
      const headers = ['company_name', 'country', 'city', 'email', 'phone', 'website_url', 'street', 'postal_code', 'state'];
      const csvContent = [headers.join(','), ...(data || []).map(contact => headers.map(header => {
        const value = contact[header as keyof BuyerContact] || '';
        return `"${value.toString().replace(/"/g, '""')}"`;
      }).join(','))].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], {
        type: 'text/csv;charset=utf-8;'
      });
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
        description: 'Export CSV téléchargé avec succès'
      });
    } catch (error) {
      console.error('Error during export:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur lors de l\'export',
        variant: 'destructive'
      });
    }
  };
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalCount);

  // Show loading state while checking subscription
  if (subscriptionLoading) {
    return <div className="container mx-auto max-w-7xl px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>;
  }

  // Show premium-only state for free users
  if (!hasPaidAccess) {
    return <div className="container mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Base de données des importateurs et acheteurs</h1>
          <p className="text-muted-foreground mt-2">
            Consultez les contacts importateurs disponibles et découvrez leurs informations essentielles.
          </p>
        </div>
        <PremiumOnlyState title="Accès réservé aux membres abonnés" description="Passez Premium pour accéder à 15 000+ acheteurs qualifiés dans le monde entier." />
      </div>;
  }
  return <div className="container mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Liste des importateurs et acheteurs</h1>
          <p className="text-muted-foreground mt-2">Choisissez un marché pour afficher la liste des importateurs et acheteurs.</p>
        </div>

        {hasPaidAccess && (
          <Dialog open={sourcingOpen} onOpenChange={setSourcingOpen}>
            <DialogTrigger asChild>
              <Button variant="default" className="shrink-0">
                <Target className="h-4 w-4 mr-2" />
                Demander une sélection sur mesure
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Recherche sur-mesure</DialogTitle>
                <DialogDescription>
                  Dites-nous quel marché vous visez, et nous nous occupons du reste. Nous sélectionnons pour vous les acheteurs qui correspondent vraiment à votre typologie de vins et de prix.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Marché cible</label>
                  <Select value={sourcingMarket} onValueChange={setSourcingMarket}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un marché" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(c => (
                        <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Crédit restant</span>
                  <Badge variant={sourcingRequestsRemaining > 0 ? 'default' : 'secondary'}>
                    {sourcingRequestsRemaining} / 1
                  </Badge>
                </div>
                {sourcingRequestsRemaining <= 0 && (
                  <p className="text-sm text-destructive">Quota mensuel atteint. Votre crédit sera renouvelé le mois prochain.</p>
                )}
                <Button
                  className="w-full"
                  disabled={!sourcingMarket || sourcingRequestsRemaining <= 0 || sourcingLoading}
                  onClick={handleSourcingSubmit}
                >
                  {sourcingLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Target className="h-4 w-4 mr-2" />}
                  Envoyer la demande
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Country Selector - Map + Continent List */}
      <CountrySelector
        selectedCountry={selectedCountry}
        onSelectCountry={setSelectedCountry}
      />

      {/* Selected country info */}
      {selectedCountry && (
        <div className="flex items-center gap-3 mt-4 mb-2">
          <span className="text-sm font-medium text-foreground">
            {COUNTRIES.find(c => c.code === selectedCountry)?.name}
          </span>
          <span className="text-sm text-muted-foreground">
            — {totalCount} contacts
          </span>
          <Button variant="ghost" size="sm" onClick={() => setSelectedCountry('')} className="text-xs h-6 px-2">
            Effacer le filtre
          </Button>
        </div>
      )}

      {/* Main Content */}
      <Card>
        {!selectedCountry ? <div className="p-12 text-center text-muted-foreground">
            Sélectionnez un marché pour afficher les contacts.
          </div> : loading ? <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Chargement...</p>
          </div> : contacts.length === 0 ? <div className="p-12 text-center text-muted-foreground">
            Aucun contact trouvé pour ce pays.
          </div> : <>
            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom de la société</TableHead>
                    <TableHead>Pays</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Site web</TableHead>
                    <TableHead>Facebook</TableHead>
                    <TableHead>Instagram</TableHead>
                    <TableHead>LinkedIn</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map(contact => {
                    const fullAddress = formatAddress(contact);
                    const formattedPhone = contact.phone ? (contact.phone.startsWith('+') ? contact.phone : `+${contact.phone}`) : '-';

                    return (
                      <TableRow key={contact.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {contact.company_name}
                        </TableCell>
                        <TableCell>
                          {translateCountry(contact.country)}
                        </TableCell>
                        <TableCell className="min-w-[300px] whitespace-normal">
                          {fullAddress}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-0.5">
                            <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-primary hover:underline">
                              <Mail className="h-3 w-3" />
                              {contact.email}
                            </a>
                            <CopyButton value={contact.email} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-0.5">
                            <span>{formattedPhone}</span>
                            {contact.phone && <CopyButton value={formattedPhone} />}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {contact.website_url ? (
                            <a href={contact.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              <span className="truncate">{contact.website_url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {contact.Facebook ? (
                            <a href={contact.Facebook} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                              <Facebook className="h-4 w-4" />
                            </a>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {contact.Instagram ? (
                            <a href={contact.Instagram} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                              <Instagram className="h-4 w-4" />
                            </a>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {contact.LinkedIn ? (
                            <a href={contact.LinkedIn} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                              <Linkedin className="h-4 w-4" />
                            </a>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-muted-foreground">
                {startItem} à {endItem} sur {totalCount}
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Précédent
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {currentPage} sur {totalPages}
                </span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                  Suivant
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </>}
      </Card>
    </div>;
};
export default Importers;