import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Eye, Plus, RotateCcw, ExternalLink, CheckCircle, X, Clock } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  status: string;
  target_markets: string[] | null;
  schedule_at: string | null;
  user_id: string;
  created_at: string;
  stats_opens: number | null;
  stats_clicks: number | null;
  stats_replies: number | null;
  prospect_count?: number;
  profiles?: {
    domain_name: string | null;
  } | null;
}

interface Wine {
  id: string;
  name: string;
  color: string;
  vintages: number[];
}

const CAMPAIGN_STATUS_LABELS = {
  draft: 'Brouillon',
  pending_validation: 'En attente',
  approved: 'Approuvée',
  sending: 'Envoi en cours',
  results: 'Terminée',
  failed: 'Échec'
};

const CAMPAIGN_STATUS_COLORS = {
  draft: 'secondary',
  pending_validation: 'yellow',
  approved: 'green',
  sending: 'blue',
  results: 'purple',
  failed: 'red'
} as const;

const REQUESTED_ACTIONS_OPTIONS = [
  { value: 'price_list', label: 'Recevoir la liste de prix' },
  { value: 'samples', label: 'Demander des échantillons' },
  { value: 'video_call', label: 'Planifier une visio' },
  { value: 'tech_sheets', label: 'Recevoir fiches techniques' },
  { value: 'other', label: 'Autre' }
];

const COUNTRIES = [
  'FR', 'BE', 'CH', 'DE', 'UK', 'US', 'CA', 'AU', 'NZ', 'JP', 'SG', 'HK'
];

export default function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [wines, setWines] = useState<Wine[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { toast } = useToast();

  // Filters
  const [filters, setFilters] = useState({
    status: ['pending_validation', 'approved', 'sending'],
    winery: '',
    period: '30',
      market: 'all',
    search: ''
  });

  // Prospect form
  const [prospectForm, setProspectForm] = useState({
    campaign_id: '',
    first_name: '',
    last_name: '',
    company_name: '',
    email: '',
    phone: '',
    website_url: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postal_code: '',
    country: 'FR',
    requested_actions: [] as string[],
    requested_other: '',
    tally_response_url: ''
  });

  const [sampleItems, setSampleItems] = useState<Array<{
    wine_id: string;
    quantity: number;
    comment: string;
  }>>([]);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [campaigns, filters]);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          profiles!inner(domain_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch prospect counts for each campaign
      const campaignsWithCounts = await Promise.all(
        (data || []).map(async (campaign) => {
          const { count } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id);

          return { ...campaign, prospect_count: count || 0 };
        })
      );

      setCampaigns(campaignsWithCounts as any);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les campagnes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = campaigns;

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(campaign => 
        filters.status.includes(campaign.status)
      );
    }

    // Winery filter
    if (filters.winery) {
      filtered = filtered.filter(campaign =>
        campaign.profiles?.domain_name?.toLowerCase().includes(filters.winery.toLowerCase())
      );
    }

    // Market filter
    if (filters.market && filters.market !== 'all') {
      filtered = filtered.filter(campaign =>
        campaign.target_markets?.includes(filters.market)
      );
    }

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(campaign =>
        campaign.name.toLowerCase().includes(searchTerm) ||
        campaign.profiles?.domain_name?.toLowerCase().includes(searchTerm)
      );
    }

    // Period filter
    if (filters.period !== 'all') {
      const days = parseInt(filters.period);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      filtered = filtered.filter(campaign =>
        new Date(campaign.created_at) >= cutoffDate
      );
    }

    setFilteredCampaigns(filtered);
  };

  const resetFilters = () => {
    setFilters({
      status: ['pending_validation', 'approved', 'sending'],
      winery: '',
      period: '30',
      market: 'all',
      search: ''
    });
  };

  const validateCampaign = async (campaignId: string, campaignName: string) => {
    if (!confirm(`Valider la campagne "${campaignName}" ?`)) {
      return;
    }

    try {
      // Update campaign status
      const { error: campaignError } = await supabase
        .from('campaigns')
        .update({ 
          status: 'approved',
          validated_at: new Date().toISOString(),
          admin_reviewer: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', campaignId);

      if (campaignError) throw campaignError;

      // Update admin task
      const { error: taskError } = await supabase
        .from('admin_tasks')
        .update({ 
          status: 'done',
          resolved_at: new Date().toISOString(),
          assignee: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('campaign_id', campaignId)
        .eq('type', 'campaign_validation');

      if (taskError) throw taskError;

      toast({
        title: "Campagne validée",
        description: `La campagne "${campaignName}" a été validée avec succès`,
      });

      fetchCampaigns(); // Refresh list
    } catch (error) {
      console.error('Error validating campaign:', error);
      toast({
        title: "Erreur",
        description: "Impossible de valider la campagne",
        variant: "destructive"
      });
    }
  };

  const rejectCampaign = async (campaignId: string, campaignName: string) => {
    const comment = prompt(`Motif de refus pour "${campaignName}" :`);
    if (!comment) return;

    try {
      // Update campaign status
      const { error: campaignError } = await supabase
        .from('campaigns')
        .update({ 
          status: 'failed',
          admin_reviewer: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', campaignId);

      if (campaignError) throw campaignError;

      // Update admin task
      const { error: taskError } = await supabase
        .from('admin_tasks')
        .update({ 
          status: 'rejected',
          resolved_at: new Date().toISOString(),
          assignee: (await supabase.auth.getUser()).data.user?.id,
          admin_comment: comment
        })
        .eq('campaign_id', campaignId)
        .eq('type', 'campaign_validation');

      if (taskError) throw taskError;

      toast({
        title: "Campagne refusée",
        description: `La campagne "${campaignName}" a été refusée`,
      });

      fetchCampaigns(); // Refresh list
    } catch (error) {
      console.error('Error rejecting campaign:', error);
      toast({
        title: "Erreur",
        description: "Impossible de refuser la campagne",
        variant: "destructive"
      });
    }
  };

  const openProspectDrawer = async (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setProspectForm(prev => ({ ...prev, campaign_id: campaign.id }));
    
    // Fetch wines for this campaign's user
    try {
      const { data, error } = await supabase
        .from('wines')
        .select('id, name, color, vintages')
        .eq('user_id', campaign.user_id)
        .eq('is_active', true);

      if (error) throw error;
      setWines(data || []);
    } catch (error) {
      console.error('Error fetching wines:', error);
    }

    setDrawerOpen(true);
  };

  const handleProspectSubmit = async () => {
    try {
      // Validate required fields
      if (!prospectForm.first_name || !prospectForm.last_name || 
          !prospectForm.company_name || !prospectForm.email) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir tous les champs obligatoires",
          variant: "destructive"
        });
        return;
      }

      // Check for duplicates
      const { data: existing, error: checkError } = await supabase
        .from('leads')
        .select('id')
        .eq('campaign_id', prospectForm.campaign_id)
        .eq('email', prospectForm.email)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        toast({
          title: "Double détecté",
          description: "Un prospect avec cet email existe déjà pour cette campagne",
          variant: "destructive"
        });
        return;
      }

      // Create prospect
      const { data: prospect, error: prospectError } = await supabase
        .from('leads')
        .insert({
          campaign_id: prospectForm.campaign_id,
          first_name: prospectForm.first_name,
          last_name: prospectForm.last_name,
          company_name: prospectForm.company_name,
          email: prospectForm.email,
          phone: prospectForm.phone,
          website_url: prospectForm.website_url,
          address_line1: prospectForm.address_line1,
          address_line2: prospectForm.address_line2,
          city: prospectForm.city,
          postal_code: prospectForm.postal_code,
          country: prospectForm.country,
          requested_actions: prospectForm.requested_actions as any,
          requested_other: prospectForm.requested_other,
          tally_response_url: prospectForm.tally_response_url,
          buyer_id: `manual_${Date.now()}`, // Generate unique buyer_id for manual entries
          market: prospectForm.country,
          status: 'new',
          created_by: (await supabase.auth.getUser()).data.user?.id,
          last_activity_at: new Date().toISOString()
        })
        .select()
        .single();

      if (prospectError) throw prospectError;

      // Create sample items if any
      if (sampleItems.length > 0) {
        const { error: samplesError } = await supabase
          .from('sample_items')
          .insert(
            sampleItems.map(item => ({
              lead_id: prospect.id,
              wine_id: item.wine_id,
              quantity: item.quantity,
              comment: item.comment
            }))
          );

        if (samplesError) throw samplesError;
      }

      toast({
        title: "Succès",
        description: "Prospect ajouté avec succès",
      });

      // Reset form and close drawer
      setProspectForm({
        campaign_id: '',
        first_name: '',
        last_name: '',
        company_name: '',
        email: '',
        phone: '',
        website_url: '',
        address_line1: '',
        address_line2: '',
        city: '',
        postal_code: '',
        country: 'FR',
        requested_actions: [],
        requested_other: '',
        tally_response_url: ''
      });
      setSampleItems([]);
      setDrawerOpen(false);
      
      // Refresh campaigns to update prospect count
      fetchCampaigns();
    } catch (error) {
      console.error('Error creating prospect:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le prospect",
        variant: "destructive"
      });
    }
  };

  const addSampleItem = () => {
    setSampleItems([...sampleItems, { wine_id: '', quantity: 1, comment: '' }]);
  };

  const removeSampleItem = (index: number) => {
    setSampleItems(sampleItems.filter((_, i) => i !== index));
  };

  const updateSampleItem = (index: number, field: string, value: any) => {
    const updated = [...sampleItems];
    updated[index] = { ...updated[index], [field]: value };
    setSampleItems(updated);
  };

  const getStatusBadge = (status: string) => {
    const color = CAMPAIGN_STATUS_COLORS[status as keyof typeof CAMPAIGN_STATUS_COLORS] || 'secondary';
    return (
      <Badge variant={color as any}>
        {CAMPAIGN_STATUS_LABELS[status as keyof typeof CAMPAIGN_STATUS_LABELS] || status}
      </Badge>
    );
  };

  const getMarketsBadges = (markets: string[] | null) => {
    if (!markets || markets.length === 0) return '-';
    
    const displayMarkets = markets.slice(0, 3);
    const remaining = markets.length - 3;
    
    return (
      <div className="flex flex-wrap gap-1">
        {displayMarkets.map(market => (
          <Badge key={market} variant="outline" className="text-xs">
            {market}
          </Badge>
        ))}
        {remaining > 0 && (
          <Badge variant="outline" className="text-xs">
            +{remaining}
          </Badge>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Admin — Campagnes</h1>
        <p className="text-muted-foreground mt-1">
          Vue globale des campagnes. Ajoutez des prospects manuellement aux campagnes actives.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label>Statut</Label>
              <Select 
                value={filters.status.join(',')} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value.split(',') }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft,pending_validation,approved,sending,results,failed">
                    Tous les statuts
                  </SelectItem>
                  <SelectItem value="pending_validation,approved,sending">
                    Actives (défaut)
                  </SelectItem>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="pending_validation">En attente</SelectItem>
                  <SelectItem value="approved">Approuvées</SelectItem>
                  <SelectItem value="sending">En envoi</SelectItem>
                  <SelectItem value="results">Terminées</SelectItem>
                  <SelectItem value="failed">Échec</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Domaine</Label>
              <Input
                placeholder="Rechercher un domaine..."
                value={filters.winery}
                onChange={(e) => setFilters(prev => ({ ...prev, winery: e.target.value }))}
              />
            </div>

            <div>
              <Label>Période</Label>
              <Select 
                value={filters.period} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, period: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toute période</SelectItem>
                  <SelectItem value="7">7 derniers jours</SelectItem>
                  <SelectItem value="30">30 derniers jours</SelectItem>
                  <SelectItem value="90">3 derniers mois</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Marché</Label>
              <Select 
                value={filters.market} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, market: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous les marchés" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les marchés</SelectItem>
                  {COUNTRIES.map(country => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Recherche</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Nom campagne..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            Campagnes ({filteredCampaigns.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune campagne selon vos filtres.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campagne</TableHead>
                  <TableHead>Domaine</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Marchés</TableHead>
                  <TableHead>Planifiée</TableHead>
                  <TableHead>KPI</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((campaign) => (
                  <TableRow key={campaign.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Button 
                        variant="link" 
                        className="p-0 h-auto font-medium text-left"
                        onClick={() => window.open(`/campaigns/${campaign.id}`, '_blank')}
                      >
                        {campaign.name}
                        <ExternalLink className="h-3 w-3 ml-1 opacity-50" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      {campaign.profiles?.domain_name || '-'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(campaign.status)}
                    </TableCell>
                    <TableCell>
                      {getMarketsBadges(campaign.target_markets)}
                    </TableCell>
                    <TableCell>
                      {campaign.schedule_at 
                        ? format(new Date(campaign.schedule_at), 'dd/MM/yyyy HH:mm', { locale: fr })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div>Prospects: {campaign.prospect_count || 0}</div>
                        {(campaign.stats_opens || 0) > 0 && (
                          <div className="text-muted-foreground">
                            {Math.round(((campaign.stats_opens || 0) / (campaign.prospect_count || 1)) * 100)}% ouv.
                          </div>
                        )}
                      </div>
                    </TableCell>
                     <TableCell>
                       <div className="flex gap-2">
                         {campaign.status === 'pending_validation' && (
                           <>
                             <Button
                               size="sm"
                               variant="default"
                               onClick={() => validateCampaign(campaign.id, campaign.name)}
                               className="bg-green-600 hover:bg-green-700"
                             >
                               <CheckCircle className="h-4 w-4 mr-1" />
                               Valider
                             </Button>
                             <Button
                               size="sm"
                               variant="destructive"
                               onClick={() => rejectCampaign(campaign.id, campaign.name)}
                             >
                               <X className="h-4 w-4 mr-1" />
                               Refuser
                             </Button>
                           </>
                         )}
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => openProspectDrawer(campaign)}
                         >
                           <Plus className="h-4 w-4 mr-1" />
                           Ajouter prospect
                         </Button>
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => window.open(`/prospects?campaign=${campaign.id}`, '_blank')}
                         >
                           <Eye className="h-4 w-4 mr-1" />
                           Voir prospects
                         </Button>
                       </div>
                     </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Prospect Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[90vh] overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle>
              Ajouter un prospect à "{selectedCampaign?.name}"
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-6 pb-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">Prénom *</Label>
                <Input
                  id="first_name"
                  value={prospectForm.first_name}
                  onChange={(e) => setProspectForm(prev => ({ ...prev, first_name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="last_name">Nom *</Label>
                <Input
                  id="last_name"
                  value={prospectForm.last_name}
                  onChange={(e) => setProspectForm(prev => ({ ...prev, last_name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="company_name">Société *</Label>
                <Input
                  id="company_name"
                  value={prospectForm.company_name}
                  onChange={(e) => setProspectForm(prev => ({ ...prev, company_name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={prospectForm.email}
                  onChange={(e) => setProspectForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={prospectForm.phone}
                  onChange={(e) => setProspectForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="website_url">Site web</Label>
                <Input
                  id="website_url"
                  value={prospectForm.website_url}
                  onChange={(e) => setProspectForm(prev => ({ ...prev, website_url: e.target.value }))}
                />
              </div>
            </div>

            {/* Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="address_line1">Adresse ligne 1</Label>
                <Input
                  id="address_line1"
                  value={prospectForm.address_line1}
                  onChange={(e) => setProspectForm(prev => ({ ...prev, address_line1: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="address_line2">Adresse ligne 2</Label>
                <Input
                  id="address_line2"
                  value={prospectForm.address_line2}
                  onChange={(e) => setProspectForm(prev => ({ ...prev, address_line2: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  value={prospectForm.city}
                  onChange={(e) => setProspectForm(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="postal_code">Code postal</Label>
                <Input
                  id="postal_code"
                  value={prospectForm.postal_code}
                  onChange={(e) => setProspectForm(prev => ({ ...prev, postal_code: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="country">Pays</Label>
                <Select 
                  value={prospectForm.country} 
                  onValueChange={(value) => setProspectForm(prev => ({ ...prev, country: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(country => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Requested Actions */}
            <div>
              <Label>Actions demandées</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {REQUESTED_ACTIONS_OPTIONS.map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.value}
                      checked={prospectForm.requested_actions.includes(option.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setProspectForm(prev => ({
                            ...prev,
                            requested_actions: [...prev.requested_actions, option.value]
                          }));
                        } else {
                          setProspectForm(prev => ({
                            ...prev,
                            requested_actions: prev.requested_actions.filter(a => a !== option.value)
                          }));
                        }
                      }}
                    />
                    <Label htmlFor={option.value} className="text-sm">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
              {prospectForm.requested_actions.includes('other') && (
                <div className="mt-2">
                  <Label htmlFor="requested_other">Préciser "Autre"</Label>
                  <Textarea
                    id="requested_other"
                    value={prospectForm.requested_other}
                    onChange={(e) => setProspectForm(prev => ({ ...prev, requested_other: e.target.value }))}
                    placeholder="Précisez la demande..."
                  />
                </div>
              )}
            </div>

            {/* Tally Response URL */}
            <div>
              <Label htmlFor="tally_response_url">Lien réponse Tally</Label>
              <Input
                id="tally_response_url"
                value={prospectForm.tally_response_url}
                onChange={(e) => setProspectForm(prev => ({ ...prev, tally_response_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            {/* Sample Items */}
            <div>
              <div className="flex items-center justify-between">
                <Label>Échantillons demandés</Label>
                <Button type="button" variant="outline" size="sm" onClick={addSampleItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter un vin
                </Button>
              </div>
              {sampleItems.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2 p-3 border rounded">
                  <div>
                    <Label>Vin</Label>
                    <Select
                      value={item.wine_id}
                      onValueChange={(value) => updateSampleItem(index, 'wine_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un vin" />
                      </SelectTrigger>
                      <SelectContent>
                        {wines.map(wine => (
                          <SelectItem key={wine.id} value={wine.id}>
                            {wine.name} ({wine.color})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Quantité</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateSampleItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <Label>Commentaire</Label>
                    <Input
                      value={item.comment}
                      onChange={(e) => updateSampleItem(index, 'comment', e.target.value)}
                      placeholder="Optionnel..."
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeSampleItem(index)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleProspectSubmit}>
                Enregistrer
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}