import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, GripVertical, MapPin, AlertTriangle, Clock, Tag } from 'lucide-react'
import { ReminderPopover } from '@/components/ReminderPopover'
import { format, differenceInDays } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
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
}

const PIPELINE_STATUS_KEYS = [
  { key: 'new', color: 'bg-slate-100 dark:bg-slate-800' },
  { key: 'samples_requested', color: 'bg-amber-50 dark:bg-amber-950' },
  { key: 'samples_sent', color: 'bg-blue-50 dark:bg-blue-950' },
  { key: 'received', color: 'bg-indigo-50 dark:bg-indigo-950' },
  { key: 'tasted', color: 'bg-purple-50 dark:bg-purple-950' },
  { key: 'negotiation', color: 'bg-orange-50 dark:bg-orange-950' },
  { key: 'won', color: 'bg-green-50 dark:bg-green-950' },
  { key: 'lost', color: 'bg-red-50 dark:bg-red-950' },
] as const

const REQUESTED_ACTION_KEYS = ['price_list', 'samples', 'video_call', 'tech_sheets', 'other'] as const

export default function Pipeline() {
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

  const [prospects, setProspects] = useState<Prospect[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [draggedProspect, setDraggedProspect] = useState<string | null>(null)

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
  }, [user])

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

      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('id, name')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (campaignsData) {
        setCampaigns(campaignsData)
      }

      const { data: prospectsData, error } = await supabase
        .from('leads')
        .select(`
          *,
          campaigns!inner(name, user_id)
        `)
        .eq('campaigns.user_id', user?.id)
        .order('last_activity_at', { ascending: false })

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

  const handleDragStart = (prospectId: string) => {
    setDraggedProspect(prospectId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (newStatus: string) => {
    if (!draggedProspect) return

    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          prospect_status: newStatus as any,
          last_activity_at: new Date().toISOString()
        })
        .eq('id', draggedProspect)

      if (error) throw error

      setProspects(prev => prev.map(p => 
        p.id === draggedProspect 
          ? { ...p, prospect_status: newStatus }
          : p
      ))

      toast({
        title: t('crm.toasts.statusUpdated.title'),
        description: t('crm.toasts.statusUpdated.description'),
      })

    } catch (error) {
      console.error('Error updating status:', error)
      toast({
        title: t('crm.toasts.statusError.title'),
        description: t('crm.toasts.statusError.description'),
        variant: "destructive",
      })
    } finally {
      setDraggedProspect(null)
    }
  }

  const handleCreateProspect = async () => {
    try {
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

  const handleRequestedActionChange = (action: string, checked: boolean) => {
    setNewProspect(prev => ({
      ...prev,
      requested_actions: checked
        ? [...prev.requested_actions, action]
        : prev.requested_actions.filter(a => a !== action)
    }))
  }

  const getProspectsByStatus = (status: string) => {
    return prospects.filter(p => p.prospect_status === status)
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{t('pipeline.title')}</h1>
            <p className="text-muted-foreground">{t('pipeline.subtitle')}</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/prospects">{t('pipeline.listView')}</Link>
            </Button>
            
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('pipeline.addProspect')}
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
                            id={`pipeline-${key}`}
                            checked={newProspect.requested_actions.includes(key)}
                            onCheckedChange={(checked) => handleRequestedActionChange(key, !!checked)}
                          />
                          <Label htmlFor={`pipeline-${key}`} className="text-sm">{t(`crm.actions.${key}`)}</Label>
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
                            id={`pipeline-sample-${cuvee}`}
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
                          <Label htmlFor={`pipeline-sample-${cuvee}`} className="text-sm">{cuvee}</Label>
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
                    {t('crm.createDialog.create')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STATUS_KEYS.map(status => {
            const statusProspects = getProspectsByStatus(status.key)
            
            return (
              <div
                key={status.key}
                className={`flex-shrink-0 w-72 rounded-lg ${status.color}`}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(status.key)}
              >
                <div className="p-3 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{t(`crm.kanbanStatuses.${status.key}`)}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {statusProspects.length}
                    </Badge>
                  </div>
                </div>
                
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="p-2 space-y-2">
                    {statusProspects.map(prospect => (
                      <Card
                        key={prospect.id}
                        draggable
                        onDragStart={() => handleDragStart(prospect.id)}
                        className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2">
                            <GripVertical className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1">
                                <Link 
                                  to={`/prospects/${prospect.id}`}
                                  className="font-medium text-sm hover:underline block truncate"
                                >
                                  {prospect.company_name || t('pipeline.noName')}
                                </Link>
                                {/* Temperature tag */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="flex-shrink-0 focus:outline-none">
                                      {prospect.status && LEAD_TAG_KEYS.find(tg => tg.key === prospect.status) ? (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${LEAD_TAG_KEYS.find(tg => tg.key === prospect.status)!.classes}`}>
                                          {t(`crm.tags.${prospect.status}`)}
                                        </span>
                                      ) : (
                                        <Tag className="w-3 h-3 text-muted-foreground opacity-50 hover:opacity-100" />
                                      )}
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-32">
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
                              </div>
                              
                              {(prospect.first_name || prospect.last_name) && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {prospect.first_name} {prospect.last_name}
                                </p>
                              )}

                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                {prospect.country && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {prospect.country}
                                  </span>
                                )}
                              </div>

                              {prospect.requested_actions && prospect.requested_actions.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {prospect.requested_actions.slice(0, 2).map(action => (
                                    <Badge key={action} variant="outline" className="text-[10px] px-1 py-0">
                                      {t(`crm.actions.${action}`)}
                                    </Badge>
                                  ))}
                                  {prospect.requested_actions.length > 2 && (
                                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                                      +{prospect.requested_actions.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              )}

                              <p className="text-[10px] text-muted-foreground mt-2">
                                {prospect.campaigns?.name}
                              </p>

                              {/* Inactivity + Reminder row */}
                              <div className="flex items-center justify-between mt-1.5">
                                {(() => {
                                  const info = getInactivityInfo(prospect.last_activity_at)
                                  return (
                                    <div className={`flex items-center gap-1 text-[10px] ${info.isAlert ? 'text-orange-500' : 'text-muted-foreground'}`}>
                                      {info.isAlert ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                      {info.label}
                                    </div>
                                  )
                                })()}
                                <ReminderPopover
                                  leadId={prospect.id}
                                  remindAt={prospect.remind_at}
                                  remindNote={prospect.remind_note}
                                  onUpdate={(remindAt, remindNote) =>
                                    setProspects(prev => prev.map(p =>
                                      p.id === prospect.id ? { ...p, remind_at: remindAt, remind_note: remindNote } : p
                                    ))
                                  }
                                  size="sm"
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {statusProspects.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        {t('pipeline.noProspects')}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
