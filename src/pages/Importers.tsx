import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Mail, ChevronLeft, ChevronRight, Target, Loader2, Copy, Check, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { PremiumOnlyState } from '@/components/PremiumOnlyState';
import CountrySingleSelect, { ALL_IMPORTER_COUNTRIES, getCountryByCode, IMPORTERS_CONTINENTS } from '@/components/importers/CountrySingleSelect';
import { ImportersMap } from '@/components/importers/ImportersMap';

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

// English name mapping for Supabase queries
const CODE_TO_ENGLISH: Record<string, string> = {
  GB: 'United Kingdom', DE: 'Germany', BE: 'Belgium', NL: 'Netherlands', CH: 'Switzerland',
  SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', PL: 'Poland',
  CZ: 'Czech Republic', AT: 'Austria', LU: 'Luxembourg', IE: 'Ireland', PT: 'Portugal',
  ES: 'Spain', IT: 'Italy', GR: 'Greece', RO: 'Romania', HU: 'Hungary',
  SK: 'Slovakia', SI: 'Slovenia', HR: 'Croatia', LV: 'Latvia', LT: 'Lithuania',
  EE: 'Estonia', RU: 'Russia',
  US: 'United States', CA: 'Canada', MX: 'Mexico',
  BR: 'Brazil', AR: 'Argentina', CL: 'Chile', CO: 'Colombia',
  JP: 'Japan', CN: 'China', KR: 'South Korea', HK: 'Hong Kong', SG: 'Singapore',
  TW: 'Taiwan', TH: 'Thailand', VN: 'Vietnam', IN: 'India',
  AE: 'United Arab Emirates', IL: 'Israel', ZA: 'South Africa', MA: 'Morocco',
  AU: 'Australia', NZ: 'New Zealand',
  // legacy
  UK: 'United Kingdom',
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
  created_at: string;
  updated_at: string;
}

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
      toast({ title: 'Erreur', description: "Impossible d'envoyer la demande", variant: 'destructive' });
    } finally {
      setSourcingLoading(false);
    }
  };

  const fetchContacts = async (code: string, page = 1, limit = 10) => {
    if (!code) { setContacts([]); setTotalCount(0); return; }
    setLoading(true);
    try {
      const englishName = CODE_TO_ENGLISH[code];
      if (!englishName) { setContacts([]); setTotalCount(0); setLoading(false); return; }
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const { data, error, count } = await supabase
        .from('buyer_contacts')
        .select('*', { count: 'exact' })
        .eq('country', englishName)
        .order('company_name', { ascending: true })
        .range(from, to);
      if (error) throw error;
      setContacts(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de charger les contacts', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchContacts(selectedCountry, 1, itemsPerPage);
  }, [selectedCountry]);

  useEffect(() => {
    fetchContacts(selectedCountry, currentPage, itemsPerPage);
  }, [currentPage]);

  const exportToCSV = async () => {
    if (!selectedCountry) return;
    const englishName = CODE_TO_ENGLISH[selectedCountry];
    if (!englishName) return;
    try {
      const { data, error } = await supabase
        .from('buyer_contacts').select('*').eq('country', englishName).order('company_name', { ascending: true }).limit(10000);
      if (error) throw error;
      const headers = ['company_name', 'country', 'city', 'email', 'phone', 'website_url', 'street', 'postal_code', 'state'];
      const csvContent = [
        headers.join(','),
        ...(data || []).map(contact =>
          headers.map(h => `"${(contact[h as keyof BuyerContact] || '').toString().replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.setAttribute('href', URL.createObjectURL(blob));
      link.setAttribute('download', `contacts_${selectedCountry}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: 'Succès', description: 'Export CSV téléchargé' });
    } catch {
      toast({ title: 'Erreur', description: "Erreur lors de l'export", variant: 'destructive' });
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalCount);

  const selectedCountryInfo = selectedCountry ? getCountryByCode(selectedCountry) : null;
  const availableCodes = ALL_IMPORTER_COUNTRIES.map(c => c.code);

  if (subscriptionLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (!hasPaidAccess) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Base de données des importateurs</h1>
          <p className="text-muted-foreground mt-2">Consultez les contacts importateurs disponibles dans le monde entier.</p>
        </div>
        <PremiumOnlyState title="Accès réservé aux membres abonnés" description="Passez Premium pour accéder à 15 000+ acheteurs qualifiés dans le monde entier." />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Base de données des importateurs</h1>
          <p className="text-muted-foreground mt-1">Sélectionnez un pays sur la carte ou dans la liste pour afficher les contacts.</p>
        </div>
        {hasPaidAccess && (
          <Dialog open={sourcingOpen} onOpenChange={setSourcingOpen}>
            <DialogTrigger asChild>
              <Button variant="default" className="shrink-0">
                <Target className="h-4 w-4 mr-2" />
                Sélection sur mesure
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Recherche sur-mesure</DialogTitle>
                <DialogDescription>
                  Dites-nous quel marché vous visez, et nous sélectionnons les acheteurs qui correspondent à votre profil.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Marché cible</label>
                  <CountrySingleSelect
                    value={sourcingMarket}
                    onChange={setSourcingMarket}
                    placeholder="Choisir un marché"
                    availableCodes={availableCodes}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Crédit restant</span>
                  <Badge variant={sourcingRequestsRemaining > 0 ? 'default' : 'secondary'}>
                    {sourcingRequestsRemaining} / 1
                  </Badge>
                </div>
                {sourcingRequestsRemaining <= 0 && (
                  <p className="text-sm text-destructive">Quota mensuel atteint. Renouvelé le mois prochain.</p>
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

      {/* Map + Selector side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Map */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Carte des marchés disponibles</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ImportersMap
                selectedCode={selectedCountry}
                onSelect={setSelectedCountry}
                availableCodes={availableCodes}
              />
            </CardContent>
          </Card>
        </div>

        {/* Selector + Stats */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Filtrer par pays</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CountrySingleSelect
                value={selectedCountry}
                onChange={setSelectedCountry}
                placeholder="Choisir un marché"
                availableCodes={availableCodes}
              />
              {selectedCountryInfo && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selectedCountryInfo.flag}</span>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{selectedCountryInfo.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {loading ? '...' : `${totalCount} contact${totalCount > 1 ? 's' : ''} disponible${totalCount > 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </div>
                  {totalCount > 0 && (
                    <Button variant="outline" size="sm" className="w-full mt-2 text-xs" onClick={exportToCSV}>
                      Exporter en CSV
                    </Button>
                  )}
                </div>
              )}
              {!selectedCountry && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Cliquez sur un pays pour voir les contacts
                </p>
              )}
            </CardContent>
          </Card>

          {/* Continent quick-access */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Par continent</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {IMPORTERS_CONTINENTS.map(continent => (
                <div key={continent.name}>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">{continent.name}</p>
                  <div className="flex flex-wrap gap-1">
                    {continent.countries.map(c => (
                      <button
                        key={c.code}
                        onClick={() => setSelectedCountry(selectedCountry === c.code ? '' : c.code)}
                        title={c.name}
                        className={`text-base leading-none rounded hover:scale-110 transition-transform p-0.5 ${
                          selectedCountry === c.code ? 'ring-2 ring-primary ring-offset-1 rounded-sm' : ''
                        }`}
                      >
                        {c.flag}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contacts Table */}
      {selectedCountry && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {selectedCountryInfo && <span>{selectedCountryInfo.flag}</span>}
              {selectedCountryInfo?.name ?? selectedCountry}
              {!loading && <Badge variant="secondary" className="text-xs">{totalCount} contacts</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                <p className="text-muted-foreground mt-2 text-sm">Chargement...</p>
              </div>
            ) : contacts.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                Aucun contact trouvé pour ce pays.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Société</TableHead>
                        <TableHead>Adresse</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Téléphone</TableHead>
                        <TableHead>Site web</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map(contact => {
                        const addressParts = [contact.street, contact.city, contact.state].filter(Boolean);
                        const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : '-';
                        const formattedPhone = contact.phone
                          ? (contact.phone.startsWith('+') ? contact.phone : `+${contact.phone}`)
                          : '-';
                        return (
                          <TableRow key={contact.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">{contact.company_name}</TableCell>
                            <TableCell className="min-w-[260px] whitespace-normal text-sm text-muted-foreground">{fullAddress}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-0.5">
                                <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-primary hover:underline text-sm">
                                  <Mail className="h-3 w-3" />
                                  {contact.email}
                                </a>
                                <CopyButton value={contact.email} />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-0.5 text-sm">
                                <span>{formattedPhone}</span>
                                {contact.phone && <CopyButton value={formattedPhone} />}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              {contact.website_url ? (
                                <a href={contact.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-sm truncate max-w-[180px]">
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{contact.website_url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                                </a>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      {startItem}–{endItem} sur {totalCount}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">{currentPage} / {totalPages}</span>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Importers;
