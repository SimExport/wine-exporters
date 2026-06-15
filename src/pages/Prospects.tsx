import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { getOrCreateManualCampaign, MANUAL_CAMPAIGN_NAME } from '@/lib/manual-campaign'
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Plus, Download, Search, SearchX, Users, AlertTriangle, Clock } from 'lucide-react'
import { ReminderPopover } from '@/components/ReminderPopover'
import { EmptyState } from '@/components/ui/empty-state'
import { subDays, isAfter, differenceInDays } from 'date-fns'
import { formatDate, formatDateFile } from '@/lib/format'
import { useTranslation } from 'react-i18next'

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
  status?: string | null
  remind_at?: string | null
  remind_note?: string | null
  campaigns?: {
    name: string
  }
}

const LEAD_TAG_KEYS = [
  { key: 'hot',  classes: 'bg-red-100 text-red-700 border-red-200' },
  { key: 'warm', classes: 'bg-amber-100 text-amber-700 border-amber-200' },
  { key: 'cold', classes: 'bg-blue-100 text-blue-700 border-blue-200' },
] as const

interface Campaign {
  id: string
  name: string
  status: string
  launched_at?: string
}

const PROSPECT_STATUS_KEYS = ['new','samples_requested','samples_sent','received','tasted','negotiation','won','lost'] as const
const REQUESTED_ACTION_KEYS = ['price_list','samples','video_call','tech_sheets','other'] as const

export default function Prospects() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { toast } = useToast()

  const getInactivityInfo = (lastActivityAt?: string): { label: string; isAlert: boolean } => {
    if (!lastActivityAt) return { label: t('crm.inactivity.none'), isAlert: false }
    const days = differenceInDays(new Date(), new Date(lastActivityAt))
    return {
      label: days === 0 ? t('crm.inactivity.today') : t('crm.inactivity.daysAgo', { count: days }),
      isAlert: days >= 15,
    }
  }

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
        // Ensure the "manual" container is selectable even before any campaign exists.
        try {
          const manualId = await getOrCreateManualCampaign(user!.id)
          const hasManual = campaignsData.some(c => c.id === manualId)
          const enriched = hasManual
            ? campaignsData
            : [{ id: manualId, name: MANUAL_CAMPAIGN_NAME, status: 'manual', launched_at: undefined } as any, ...campaignsData]
          setCampaigns(enriched)
        } catch {
          setCampaigns(campaignsData)
        }
        
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
        .is('archived_at', null)
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
        title: t('crm.toasts.loadError.title'),
        description: t('crm.toasts.loadError.description'),
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
          title: t('crm.toasts.duplicate.title'),
          description: t('crm.toasts.duplicate.description'),
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
            ? t('crm.createDialog.samplesRequestedSnippet', { list: newProspect.requested_samples.join(', ') })
            : null
        })

      if (error) throw error

      toast({
        title: t('crm.toasts.created.title'),
        description: t('crm.toasts.created.description'),
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
        title: t('crm.toasts.createError.title'),
        description: t('crm.toasts.createError.description'),
        variant: "destructive",
      })
    }
  }

  const handleExportCSV = () => {
    const headers = t('prospects.csv.headers', { returnObjects: true }) as string[]
    const rows = prospects.map(p => [
      formatDate(p.created_at),
      p.campaigns?.name || '',
      p.company_name || '',
      `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      p.country || '',
      p.requested_actions?.map(a => t(`crm.actions.${a}`)).join(', ') || '',
      t(`crm.statuses.${p.prospect_status}`)
    ])

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = t('prospects.csv.filename', { date: formatDateFile() })
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

  const handleTagUpdate = async (prospectId: string, tag: string | null) => {
    try {
      await supabase.from('leads').update({ status: tag }).eq('id', prospectId)
      setProspects(prev => prev.map(p => p.id === prospectId ? { ...p, status: tag } : p))
    } catch (error) {
      console.error('Error updating tag:', error)
    }
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
          <h1 className="text-3xl font-bold">{t('prospects.title')}</h1>
          <p className="text-muted-foreground">{t('prospects.subtitle')}</p>
        </div>

        {/* SLA Banner */}
        {showSLABanner && (
          <Alert>
            <AlertDescription>
              {t('prospects.slaBanner')}
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="campaign-filter">{t('prospects.filters.campaign')}</Label>
                <Select value={filters.campaign} onValueChange={(value) => setFilters(prev => ({ ...prev, campaign: value === 'all' ? '' : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('prospects.filters.allCampaigns')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('prospects.filters.allCampaigns')}</SelectItem>
                    {campaigns.map(campaign => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status-filter">{t('prospects.filters.status')}</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === 'all' ? '' : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('prospects.filters.allStatuses')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('prospects.filters.allStatuses')}</SelectItem>
                    {PROSPECT_STATUS_KEYS.map((key) => (
                      <SelectItem key={key} value={key}>{t(`crm.statuses.${key}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="period-filter">{t('prospects.filters.period')}</Label>
                <Select value={filters.period} onValueChange={(value) => setFilters(prev => ({ ...prev, period: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">{t('prospects.filters.period7')}</SelectItem>
                    <SelectItem value="30">{t('prospects.filters.period30')}</SelectItem>
                    <SelectItem value="90">{t('prospects.filters.period90')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="search">{t('prospects.filters.search')}</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('prospects.filters.searchPlaceholder')}
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
              {t('prospects.exportCSV')}
            </Button>
          </div>
          
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t('prospects.addProspect')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t('crm.createDialog.title')}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="campaign">{t('crm.createDialog.campaign')}</Label>
                    <Select value={newProspect.campaign_id} onValueChange={(value) => setNewProspect(prev => ({ ...prev, campaign_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('crm.createDialog.campaignPlaceholder')} />
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
                    <Label htmlFor="country">{t('crm.createDialog.country')}</Label>
                    <Input
                      value={newProspect.country}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, country: e.target.value }))}
                      placeholder={t('crm.createDialog.countryPlaceholder')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">{t('crm.createDialog.firstName')}</Label>
                    <Input
                      value={newProspect.first_name}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, first_name: e.target.value }))}
                      placeholder={t('crm.createDialog.firstNamePlaceholder')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">{t('crm.createDialog.lastName')}</Label>
                    <Input
                      value={newProspect.last_name}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, last_name: e.target.value }))}
                      placeholder={t('crm.createDialog.lastNamePlaceholder')}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="company_name">{t('crm.createDialog.company')}</Label>
                  <Input
                    value={newProspect.company_name}
                    onChange={(e) => setNewProspect(prev => ({ ...prev, company_name: e.target.value }))}
                    placeholder={t('crm.createDialog.companyPlaceholder')}
                  />
                </div>

                <div>
                  <Label htmlFor="email">{t('crm.createDialog.email')}</Label>
                  <Input
                    type="email"
                    value={newProspect.email}
                    onChange={(e) => setNewProspect(prev => ({ ...prev, email: e.target.value }))}
                    placeholder={t('crm.createDialog.emailPlaceholder')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">{t('crm.createDialog.phone')}</Label>
                    <Input
                      value={newProspect.phone}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder={t('crm.createDialog.phonePlaceholder')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="website_url">{t('crm.createDialog.website')}</Label>
                    <Input
                      value={newProspect.website_url}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, website_url: e.target.value }))}
                      placeholder={t('crm.createDialog.websitePlaceholder')}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">{t('crm.createDialog.address')}</Label>
                  <Input
                    value={newProspect.address_line1}
                    onChange={(e) => setNewProspect(prev => ({ ...prev, address_line1: e.target.value }))}
                    placeholder={t('crm.createDialog.addressPlaceholder')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">{t('crm.createDialog.city')}</Label>
                    <Input
                      value={newProspect.city}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, city: e.target.value }))}
                      placeholder={t('crm.createDialog.cityPlaceholder')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="postal_code">{t('crm.createDialog.postal')}</Label>
                    <Input
                      value={newProspect.postal_code}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, postal_code: e.target.value }))}
                      placeholder={t('crm.createDialog.postalPlaceholder')}
                    />
                  </div>
                </div>

                <div>
                  <Label>{t('crm.createDialog.requestedActions')}</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {REQUESTED_ACTION_KEYS.map((key) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={key}
                          checked={newProspect.requested_actions.includes(key)}
                          onCheckedChange={(checked) => handleRequestedActionChange(key, !!checked)}
                        />
                        <Label htmlFor={key} className="text-sm">{t(`crm.actions.${key}`)}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>{t('crm.createDialog.requestedSamples')}</Label>
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
                      <p className="text-sm text-muted-foreground col-span-2">{t('crm.createDialog.noCuvees')}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  {t('crm.createDialog.cancel')}
                </Button>
                <Button 
                  onClick={handleCreateProspect}
                  disabled={!newProspect.campaign_id || !newProspect.first_name || !newProspect.last_name || !newProspect.company_name || !newProspect.email}
                >
                  {t('crm.createDialog.createShort')}
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
                    title={t('prospects.empty.filteredTitle')}
                    description={t('prospects.empty.filteredDesc')}
                    action={{ label: t('prospects.empty.clearFilters'), onClick: () => setFilters({ campaign: 'all', country: '', status: 'all', requestedActions: [], period: '30', search: '' }) }}
                  />
                : <EmptyState
                    icon={<Users className="h-10 w-10" />}
                    title={t('prospects.empty.noneTitle')}
                    description={t('prospects.empty.noneDesc')}
                    action={{ label: t('prospects.empty.viewCampaigns'), href: "/campaigns" }}
                  />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('prospects.table.dateAdded')}</TableHead>
                    <TableHead>{t('prospects.table.campaign')}</TableHead>
                    <TableHead>{t('prospects.table.company')}</TableHead>
                    <TableHead>{t('prospects.table.contact')}</TableHead>
                    <TableHead>{t('prospects.table.country')}</TableHead>
                    <TableHead>{t('prospects.table.actions')}</TableHead>
                    <TableHead>{t('prospects.table.status')}</TableHead>
                    <TableHead>{t('prospects.table.tag')}</TableHead>
                    <TableHead>{t('prospects.table.reminder')}</TableHead>
                    <TableHead>{t('prospects.table.lastUpdate')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prospects.map((prospect) => (
                    <TableRow key={prospect.id} className="hover:bg-muted/50">
                      <TableCell>
                        {formatDate(prospect.created_at)}
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
                              {t(`crm.actions.${action}`)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={prospect.prospect_status === 'won' ? 'default' : 
                                  prospect.prospect_status === 'lost' ? 'destructive' : 'secondary'}
                        >
                          {t(`crm.statuses.${prospect.prospect_status}`)}
                        </Badge>
                      </TableCell>
                      {/* Temperature tag cell */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="focus:outline-none">
                              {prospect.status && LEAD_TAG_KEYS.find(tg => tg.key === prospect.status) ? (
                                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium cursor-pointer ${LEAD_TAG_KEYS.find(tg => tg.key === prospect.status)!.classes}`}>
                                  {t(`crm.tags.${prospect.status}`)}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground border border-dashed rounded-full px-2 py-0.5 hover:border-foreground/40">{t('crm.tags.addTag')}</span>
                              )}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-32">
                            {LEAD_TAG_KEYS.map(tag => (
                              <DropdownMenuItem key={tag.key} onClick={() => handleTagUpdate(prospect.id, tag.key)}>
                                <span className={`text-xs px-1.5 py-0.5 rounded-full border mr-2 ${tag.classes}`}>{t(`crm.tags.${tag.key}`)}</span>
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuItem onClick={() => handleTagUpdate(prospect.id, null)}>
                              <span className="text-xs text-muted-foreground">{t('crm.tags.none')}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      {/* Reminder cell */}
                      <TableCell>
                        <ReminderPopover
                          leadId={prospect.id}
                          remindAt={prospect.remind_at}
                          remindNote={prospect.remind_note}
                          onUpdate={(remindAt, remindNote) =>
                            setProspects(prev => prev.map(p =>
                              p.id === prospect.id ? { ...p, remind_at: remindAt, remind_note: remindNote } : p
                            ))
                          }
                        />
                      </TableCell>
                      {/* Inactivity cell */}
                      <TableCell>
                        {(() => {
                          const info = getInactivityInfo(prospect.last_activity_at)
                          return (
                            <span className={`flex items-center gap-1 text-xs ${info.isAlert ? 'text-orange-500 font-medium' : 'text-muted-foreground'}`}>
                              {info.isAlert && <AlertTriangle className="w-3 h-3" />}
                              {info.label}
                            </span>
                          )
                        })()}
                      </TableCell>
                      <TableCell>
                        <Link to={`/prospects/${prospect.id}`}>
                          <Button variant="ghost" size="sm">
                            {t('prospects.table.open')}
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
                  <Label>{t('prospects.pagination.show')}</Label>
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
                    {t('prospects.pagination.previous')}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {t('prospects.pagination.page', { n: currentPage })}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={prospects.length < pageSize}
                  >
                    {t('prospects.pagination.next')}
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