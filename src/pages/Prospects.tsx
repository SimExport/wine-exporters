import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Download, ExternalLink, Search, Filter, Kanban, SearchX, Users } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { format, subDays, isAfter } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Prospect {
  id: string
  first_name?: string
  last_name?: string
  company_name?: string
  email?: string
  country?: string
  requested_actions?: string[]
  prospect_status: string
  last_activity_at?: string
  created_at: string
  campaign_id: string
  campaigns?: {
    name: string
  }
}

interface Campaign {
  id: string
  name: string
  status: string
  launched_at?: string
}

const PROSPECT_STATUS_LABELS = {
  new: 'Nouveau',
  samples_requested: 'Échantillons demandés',
  samples_sent: 'Échantillons envoyés',
  received: 'Reçu',
  tasted: 'Dégusté',
  negotiation: 'Négociation',
  won: 'Gagné',
  lost: 'Perdu'
}

const REQUESTED_ACTION_LABELS = {
  price_list: 'Liste de prix',
  samples: 'Échantillons',
  video_call: 'Visioconférence',
  tech_sheets: 'Fiches techniques',
  other: 'Autre'
}

export default function Prospects() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSLABanner, setShowSLABanner] = useState(false)
  const [pageSize, setPageSize] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)

  // Filters
  const [filters, setFilters] = useState({
    campaign: searchParams.get('campaign') || 'all',
    country: searchParams.get('country') || '',
    status: searchParams.get('status') || 'all',
    requestedActions: searchParams.get('actions')?.split(',') || [],
    period: searchParams.get('period') || '30',
    search: searchParams.get('search') || ''
  })

  const [newProspect, setNewProspect] = useState({
    campaign_id: '',
    first_name: '',
    last_name: '',
    company_name: '',
    email: '',
    phone: '',
    website_url: '',
    address_line1: '',
    city: '',
    postal_code: '',
    country: '',
    requested_actions: [] as string[],
    requested_samples: [] as string[]
  })
  const [profileCuvees, setProfileCuvees] = useState<string[]>([])

  useEffect(() => {
    if (user) {
      loadData()
      loadProfileCuvees()
    }
  }, [user, filters, currentPage, pageSize])

  const loadProfileCuvees = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('cuvees')
      .eq('user_id', user?.id)
      .single()
    
    if (data?.cuvees) {
      setProfileCuvees(data.cuvees)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load campaigns first
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('id, name, status, launched_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (campaignsData) {
        setCampaigns(campaignsData)
        
        // Check for SLA banner
        const recentCampaign = campaignsData.find(c => 
          ['sending', 'results'].includes(c.status) && 
          c.launched_at && 
          isAfter(new Date(), subDays(new Date(c.launched_at), 7))
        )
        
        if (recentCampaign) {
          const { count } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', recentCampaign.id)
          
          setShowSLABanner(count === 0)
        }
      }

      // Build prospects query
      let query = supabase
        .from('leads')
        .select(`
          *,
          campaigns!inner(name, user_id)
        `)
        .eq('campaigns.user_id', user?.id)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.campaign && filters.campaign !== 'all') {
        query = query.eq('campaign_id', filters.campaign)
      }
      
      if (filters.country) {
        query = query.eq('country', filters.country)
      }
      
      if (filters.status && filters.status !== 'all') {
        query = query.eq('prospect_status', filters.status as any)
      }
      
      if (filters.requestedActions.length > 0) {
        query = query.overlaps('requested_actions', filters.requestedActions)
      }

      if (filters.period !== 'custom') {
        const daysAgo = parseInt(filters.period)
        const cutoffDate = subDays(new Date(), daysAgo).toISOString()
        query = query.gte('created_at', cutoffDate)
      }

      if (filters.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
      }

      // Pagination
      const offset = (currentPage - 1) * pageSize
      query = query.range(offset, offset + pageSize - 1)

      const { data: prospectsData, error } = await query

      if (error) throw error

      setProspects(prospectsData || [])
      
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProspect = async () => {
    try {
      // Check for duplicate
      const { data: existing } = await supabase
        .from('leads')
        .select('id')
        .eq('campaign_id', newProspect.campaign_id)
        .eq('email', newProspect.email)
        .maybeSingle()

      if (existing) {
        toast({
          title: "Prospect existant",
          description: "Un prospect avec cet email existe déjà pour cette campagne",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase
        .from('leads')
        .insert({
          campaign_id: newProspect.campaign_id,
          first_name: newProspect.first_name,
          last_name: newProspect.last_name,
          company_name: newProspect.company_name,
          email: newProspect.email,
          phone: newProspect.phone,
          website_url: newProspect.website_url,
          address_line1: newProspect.address_line1,
          city: newProspect.city,
          postal_code: newProspect.postal_code,
          country: newProspect.country,
          buyer_id: newProspect.email || 'unknown',
          market: newProspect.country || 'unknown',
          prospect_status: 'new' as any,
          last_activity_at: new Date().toISOString(),
          created_by: user?.id,
          requested_actions: newProspect.requested_actions as any,
          message_snippet: newProspect.requested_samples.length > 0 
            ? `Échantillons demandés: ${newProspect.requested_samples.join(', ')}`
            : null
        })

      if (error) throw error

      toast({
        title: "Prospect créé",
        description: "Le prospect a été ajouté avec succès",
      })

      setShowCreateModal(false)
      setNewProspect({
        campaign_id: '',
        first_name: '',
        last_name: '',
        company_name: '',
        email: '',
        phone: '',
        website_url: '',
        address_line1: '',
        city: '',
        postal_code: '',
        country: '',
        requested_actions: [],
        requested_samples: []
      })
      loadData()

    } catch (error) {
      console.error('Error creating prospect:', error)
      toast({
        title: "Erreur",
        description: "Impossible de créer le prospect",
        variant: "destructive",
      })
    }
  }

  const handleExportCSV = () => {
    // Simple CSV export of visible data
    const headers = ['Date', 'Campagne', 'Société', 'Contact', 'Pays', 'Actions demandées', 'Statut']
    const rows = prospects.map(p => [
      format(new Date(p.created_at), 'dd/MM/yyyy', { locale: fr }),
      p.campaigns?.name || '',
      p.company_name || '',
      `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      p.country || '',
      p.requested_actions?.map(a => REQUESTED_ACTION_LABELS[a as keyof typeof REQUESTED_ACTION_LABELS]).join(', ') || '',
      PROSPECT_STATUS_LABELS[p.prospect_status as keyof typeof PROSPECT_STATUS_LABELS]
    ])

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prospects-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleRequestedActionChange = (action: string, checked: boolean) => {
    setNewProspect(prev => ({
      ...prev,
      requested_actions: checked
        ? [...prev.requested_actions, action]
        : prev.requested_actions.filter(a => a !== action)
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Prospects</h1>
          <p className="text-muted-foreground">Acheteurs intéressés suite à vos campagnes</p>
        </div>

        {/* SLA Banner */}
        {showSLABanner && (
          <Alert>
            <AlertDescription>
              Les prospects sont ajoutés par un admin sous 7 jours après l'envoi.
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="campaign-filter">Campagne</Label>
                <Select value={filters.campaign} onValueChange={(value) => setFilters(prev => ({ ...prev, campaign: value === 'all' ? '' : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les campagnes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les campagnes</SelectItem>
                    {campaigns.map(campaign => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status-filter">Statut</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === 'all' ? '' : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    {Object.entries(PROSPECT_STATUS_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="period-filter">Période</Label>
                <Select value={filters.period} onValueChange={(value) => setFilters(prev => ({ ...prev, period: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 derniers jours</SelectItem>
                    <SelectItem value="30">30 derniers jours</SelectItem>
                    <SelectItem value="90">90 derniers jours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="search">Recherche</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nom, société, email..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button onClick={handleExportCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exporter CSV
            </Button>
            <Button asChild variant="outline">
              <Link to="/pipeline">
                <Kanban className="w-4 h-4 mr-2" />
                Vue Kanban
              </Link>
            </Button>
          </div>
          
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un prospect
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Créer un prospect</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="campaign">Campagne *</Label>
                    <Select value={newProspect.campaign_id} onValueChange={(value) => setNewProspect(prev => ({ ...prev, campaign_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une campagne" />
                      </SelectTrigger>
                      <SelectContent>
                        {campaigns.map(campaign => (
                          <SelectItem key={campaign.id} value={campaign.id}>
                            {campaign.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="country">Pays</Label>
                    <Input
                      value={newProspect.country}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, country: e.target.value }))}
                      placeholder="France"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">Prénom *</Label>
                    <Input
                      value={newProspect.first_name}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, first_name: e.target.value }))}
                      placeholder="Jean"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Nom *</Label>
                    <Input
                      value={newProspect.last_name}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, last_name: e.target.value }))}
                      placeholder="Dupont"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="company_name">Société *</Label>
                  <Input
                    value={newProspect.company_name}
                    onChange={(e) => setNewProspect(prev => ({ ...prev, company_name: e.target.value }))}
                    placeholder="Caves Martin"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    type="email"
                    value={newProspect.email}
                    onChange={(e) => setNewProspect(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="jean@caves-martin.fr"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      value={newProspect.phone}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+33 6 12 34 56 78"
                    />
                  </div>
                  <div>
                    <Label htmlFor="website_url">Site web</Label>
                    <Input
                      value={newProspect.website_url}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, website_url: e.target.value }))}
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    value={newProspect.address_line1}
                    onChange={(e) => setNewProspect(prev => ({ ...prev, address_line1: e.target.value }))}
                    placeholder="123 rue du Commerce"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">Ville</Label>
                    <Input
                      value={newProspect.city}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="Paris"
                    />
                  </div>
                  <div>
                    <Label htmlFor="postal_code">Code postal</Label>
                    <Input
                      value={newProspect.postal_code}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, postal_code: e.target.value }))}
                      placeholder="75001"
                    />
                  </div>
                </div>

                <div>
                  <Label>Actions demandées</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {Object.entries(REQUESTED_ACTION_LABELS).map(([key, label]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={key}
                          checked={newProspect.requested_actions.includes(key)}
                          onCheckedChange={(checked) => handleRequestedActionChange(key, !!checked)}
                        />
                        <Label htmlFor={key} className="text-sm">{label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Échantillons demandés</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {profileCuvees.map((cuvee) => (
                      <div key={cuvee} className="flex items-center space-x-2">
                        <Checkbox
                          id={`sample-${cuvee}`}
                          checked={newProspect.requested_samples.includes(cuvee)}
                          onCheckedChange={(checked) => {
                            setNewProspect(prev => ({
                              ...prev,
                              requested_samples: checked
                                ? [...prev.requested_samples, cuvee]
                                : prev.requested_samples.filter(c => c !== cuvee)
                            }))
                          }}
                        />
                        <Label htmlFor={`sample-${cuvee}`} className="text-sm">{cuvee}</Label>
                      </div>
                    ))}
                    {profileCuvees.length === 0 && (
                      <p className="text-sm text-muted-foreground col-span-2">Aucune cuvée dans votre profil</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={handleCreateProspect}
                  disabled={!newProspect.campaign_id || !newProspect.first_name || !newProspect.last_name || !newProspect.company_name || !newProspect.email}
                >
                  Créer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <Card>
          <CardContent>
            {prospects.length === 0 ? (
              (filters.campaign !== 'all' || filters.country !== '' || filters.status !== 'all' || filters.requestedActions.length > 0 || filters.search !== '')
                ? <EmptyState
                    icon={<SearchX className="h-10 w-10" />}
                    title="Aucun résultat"
                    description="Aucun prospect ne correspond à vos filtres actuels."
                    action={{ label: "Effacer les filtres", onClick: () => setFilters({ campaign: 'all', country: '', status: 'all', requestedActions: [], period: '30', search: '' }) }}
                  />
                : <EmptyState
                    icon={<Users className="h-10 w-10" />}
                    title="Vos premiers prospects apparaîtront ici"
                    description="Lancez une campagne pour commencer à recevoir des réponses d'importateurs."
                    action={{ label: "Voir mes campagnes", href: "/campaigns" }}
                  />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date ajout</TableHead>
                    <TableHead>Campagne</TableHead>
                    <TableHead>Société</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Pays</TableHead>
                    <TableHead>Actions demandées</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Dernière MAJ</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prospects.map((prospect) => (
                    <TableRow key={prospect.id} className="hover:bg-muted/50">
                      <TableCell>
                        {format(new Date(prospect.created_at), 'dd/MM/yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="cursor-pointer">
                          {prospect.campaigns?.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {prospect.company_name}
                      </TableCell>
                      <TableCell>
                        {`${prospect.first_name || ''} ${prospect.last_name || ''}`.trim()}
                      </TableCell>
                      <TableCell>{prospect.country}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {prospect.requested_actions?.map(action => (
                            <Badge key={action} variant="secondary" className="text-xs">
                              {REQUESTED_ACTION_LABELS[action as keyof typeof REQUESTED_ACTION_LABELS]}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={prospect.prospect_status === 'won' ? 'default' : 
                                  prospect.prospect_status === 'lost' ? 'destructive' : 'secondary'}
                        >
                          {PROSPECT_STATUS_LABELS[prospect.prospect_status as keyof typeof PROSPECT_STATUS_LABELS]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {prospect.last_activity_at && format(new Date(prospect.last_activity_at), 'dd/MM/yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <Link to={`/prospects/${prospect.id}`}>
                          <Button variant="ghost" size="sm">
                            Ouvrir
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Pagination */}
            {prospects.length > 0 && (
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-2">
                  <Label>Afficher:</Label>
                  <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Précédent
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={prospects.length < pageSize}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}