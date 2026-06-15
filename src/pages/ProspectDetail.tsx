import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  Plus, 
  Edit, 
  Trash2,
  ExternalLink,
  MessageSquare,
  MoreVertical,
  Archive,
} from 'lucide-react'
import { formatDateTime, formatCurrency } from '@/lib/format'
import { useTranslation } from 'react-i18next'

interface Prospect {
  id: string
  first_name?: string
  last_name?: string
  company_name?: string
  email?: string
  phone?: string
  website_url?: string
  address_line1?: string
  address_line2?: string
  city?: string
  postal_code?: string
  country?: string
  requested_actions?: string[]
  requested_other?: string
  prospect_status: string
  stage_id?: string | null
  estimated_amount?: number
  lost_reason?: string
  last_activity_at?: string
  tally_response_id?: string
  tally_response_url?: string
  created_at: string
  campaign_id: string
  campaigns?: {
    name: string
  }
}

interface SampleItem {
  id: string
  wine_id?: string
  quantity: number
  comment?: string
  wines?: {
    name: string
  }
}

interface Note {
  id: string
  body: string
  created_at: string
  user_id: string
}

interface Wine {
  id: string
  name: string
}

const PROSPECT_STATUS_KEYS = ['new','samples_requested','samples_sent','received','tasted','negotiation','won','lost'] as const
const REQUESTED_ACTION_KEYS = ['price_list','samples','video_call','tech_sheets','other'] as const

interface PipelineStageLite {
  id: string
  name: string
  position: number
}

export default function ProspectDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [prospect, setProspect] = useState<Prospect | null>(null)
  const [sampleItems, setSampleItems] = useState<SampleItem[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [wines, setWines] = useState<Wine[]>([])
  const [stages, setStages] = useState<PipelineStageLite[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [showAddSample, setShowAddSample] = useState(false)
  const [confirmAction, setConfirmAction] = useState<null | 'archive' | 'delete'>(null)
  const [processingAction, setProcessingAction] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [newSample, setNewSample] = useState({
    wine_id: '',
    quantity: 1,
    comment: ''
  })

  useEffect(() => {
    if (user && id) {
      loadData()
    }
  }, [user, id])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load prospect with campaign
      const { data: prospectData, error: prospectError } = await supabase
        .from('leads')
        .select(`
          *,
          campaigns!inner(name, user_id)
        `)
        .eq('id', id)
        .eq('campaigns.user_id', user?.id)
        .single()

      if (prospectError) throw prospectError
      setProspect(prospectData)

      // Load sample items with wines
      const { data: samplesData } = await supabase
        .from('sample_items')
        .select(`
          *,
          wines(name)
        `)
        .eq('lead_id', id)
        .order('created_at', { ascending: false })

      setSampleItems(samplesData || [])

      // Load notes
      const { data: notesData } = await supabase
        .from('prospect_notes')
        .select('*')
        .eq('lead_id', id)
        .order('created_at', { ascending: false })

      setNotes(notesData || [])

      // Load user's pipeline stages
      const { data: stagesData } = await supabase
        .from('pipeline_stages' as any)
        .select('id, name, position')
        .eq('user_id', user?.id)
        .order('position', { ascending: true })
      setStages((stagesData as any) || [])

      // Load user's wines for sample selection
      const { data: winesData } = await supabase
        .from('wines')
        .select('id, name')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('name')

      setWines(winesData || [])

      // Also load cuvées from profile as fallback
      const { data: profileData } = await supabase
        .from('profiles')
        .select('cuvees')
        .eq('user_id', user?.id)
        .single()

      // If no wines but has cuvées in profile, use those
      if ((!winesData || winesData.length === 0) && profileData?.cuvees?.length > 0) {
        // Create pseudo-wines from cuvées for the dropdown
        setWines(profileData.cuvees.map((cuvee: string, index: number) => ({
          id: `cuvee-${index}`,
          name: cuvee
        })))
      }

    } catch (error) {
      console.error('Error loading prospect:', error)
      toast({
        title: t('prospectDetail.toasts.loadError.title'),
        description: t('prospectDetail.toasts.loadError.description'),
        variant: "destructive",
      })
      navigate('/prospects')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (newStatus: string) => {
    if (!prospect) return

    // Validate required fields for won/lost
    if (newStatus === 'won' && !prospect.estimated_amount) {
      toast({
        title: t('prospectDetail.toasts.amountRequired.title'),
        description: t('prospectDetail.toasts.amountRequired.description'),
        variant: "destructive",
      })
      return
    }

    if (newStatus === 'lost' && !prospect.lost_reason) {
      toast({
        title: t('prospectDetail.toasts.reasonRequired.title'),
        description: t('prospectDetail.toasts.reasonRequired.description'),
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          prospect_status: newStatus as any,
          last_activity_at: new Date().toISOString()
        })
        .eq('id', prospect.id)

      if (error) throw error

      setProspect(prev => prev ? { 
        ...prev, 
        prospect_status: newStatus as any,
        last_activity_at: new Date().toISOString()
      } : null)

      toast({
        title: t('prospectDetail.toasts.statusUpdated.title'),
        description: t('prospectDetail.toasts.statusUpdated.description', { label: t(`crm.statuses.${newStatus}`) }),
      })

    } catch (error) {
      console.error('Error updating status:', error)
      toast({
        title: t('prospectDetail.toasts.statusError.title'),
        description: t('prospectDetail.toasts.statusError.description'),
        variant: "destructive",
      })
    }
  }

  const handleUpdateStageId = async (newStageId: string) => {
    if (!prospect) return
    const previous = prospect.stage_id
    // optimistic
    setProspect(prev => prev ? { ...prev, stage_id: newStageId } : null)
    const { error } = await supabase
      .from('leads')
      .update({ stage_id: newStageId, last_activity_at: new Date().toISOString() } as any)
      .eq('id', prospect.id)
    if (error) {
      setProspect(prev => prev ? { ...prev, stage_id: previous ?? null } : null)
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      })
      return
    }
    toast({ title: t('prospectDetail.stageSelect.updated') })
  }

  const handleAddNote = async () => {
    if (!newNote.trim() || !prospect) return

    try {
      const { data, error } = await supabase
        .from('prospect_notes')
        .insert({
          lead_id: prospect.id,
          user_id: user?.id,
          body: newNote.trim()
        })
        .select()
        .single()

      if (error) throw error

      setNotes(prev => [data, ...prev])
      setNewNote('')

      toast({
        title: t('prospectDetail.toasts.noteAdded.title'),
        description: t('prospectDetail.toasts.noteAdded.description'),
      })

    } catch (error) {
      console.error('Error adding note:', error)
      toast({
        title: t('prospectDetail.toasts.noteError.title'),
        description: t('prospectDetail.toasts.noteError.description'),
        variant: "destructive",
      })
    }
  }

  const handleAddSample = async () => {
    if (!newSample.wine_id || !prospect) return

    try {
      // Check if this is a cuvée from profile (starts with "cuvee-") or a real wine
      const isCuveeFromProfile = newSample.wine_id.startsWith('cuvee-')
      const selectedWine = wines.find(w => w.id === newSample.wine_id)

      const { data, error } = await supabase
        .from('sample_items')
        .insert({
          lead_id: prospect.id,
          wine_id: isCuveeFromProfile ? null : newSample.wine_id,
          quantity: newSample.quantity,
          comment: isCuveeFromProfile ? `${t('prospectDetail.samples.cuveePrefix', { name: selectedWine?.name })}${newSample.comment ? ` - ${newSample.comment}` : ''}` : newSample.comment
        })
        .select(`
          *,
          wines(name)
        `)
        .single()

      if (error) throw error

      // For cuvées from profile, manually set the wine name for display
      const itemToAdd = {
        ...data,
        wines: isCuveeFromProfile ? { name: selectedWine?.name || t('prospectDetail.samples.cuveeFallback') } : data.wines
      }

      setSampleItems(prev => [itemToAdd, ...prev])
      setNewSample({ wine_id: '', quantity: 1, comment: '' })
      setShowAddSample(false)

      toast({
        title: t('prospectDetail.toasts.sampleAdded.title'),
        description: t('prospectDetail.toasts.sampleAdded.description'),
      })

    } catch (error) {
      console.error('Error adding sample:', error)
      toast({
        title: t('prospectDetail.toasts.sampleError.title'),
        description: t('prospectDetail.toasts.sampleError.description'),
        variant: "destructive",
      })
    }
  }

  const handleMarkSamplesSent = async () => {
    if (!sampleItems.length) return
    await handleUpdateStatus('samples_sent')
  }

  const handleRequestedActionChange = (action: string, checked: boolean) => {
    if (!prospect) return

    const newActions = checked
      ? [...(prospect.requested_actions || []), action]
      : (prospect.requested_actions || []).filter(a => a !== action)

    setProspect(prev => prev ? { ...prev, requested_actions: newActions as any } : null)
  }

  const handleSaveChanges = async () => {
    if (!prospect) return

    try {
      const { error } = await supabase
        .from('leads')
        .update({
          first_name: prospect.first_name,
          last_name: prospect.last_name,
          company_name: prospect.company_name,
          email: prospect.email,
          phone: prospect.phone,
          website_url: prospect.website_url,
          address_line1: prospect.address_line1,
          address_line2: prospect.address_line2,
          city: prospect.city,
          postal_code: prospect.postal_code,
          country: prospect.country,
          requested_actions: prospect.requested_actions as any,
          requested_other: prospect.requested_other,
          estimated_amount: prospect.estimated_amount,
          lost_reason: prospect.lost_reason,
          last_activity_at: new Date().toISOString()
        })
        .eq('id', prospect.id)

      if (error) throw error

      setEditing(false)
      toast({
        title: t('prospectDetail.toasts.saved.title'),
        description: t('prospectDetail.toasts.saved.description'),
      })

    } catch (error) {
      console.error('Error saving changes:', error)
      toast({
        title: t('prospectDetail.toasts.saveError.title'),
        description: t('prospectDetail.toasts.saveError.description'),
        variant: "destructive",
      })
    }
  }

  const handleArchive = async () => {
    if (!prospect) return
    setProcessingAction(true)
    try {
      const { error } = await supabase
        .from('leads')
        .update({ archived_at: new Date().toISOString() } as any)
        .eq('id', prospect.id)
      if (error) throw error
      toast({
        title: t('prospectDetail.toasts.archived.title'),
        description: t('prospectDetail.toasts.archived.description'),
      })
      navigate('/pipeline')
    } catch (error: any) {
      console.error('Error archiving prospect:', error)
      toast({
        title: t('common.error'),
        description: error?.message || t('prospectDetail.toasts.archiveError.description'),
        variant: 'destructive',
      })
    } finally {
      setProcessingAction(false)
      setConfirmAction(null)
    }
  }

  const handleDelete = async () => {
    if (!prospect) return
    setProcessingAction(true)
    try {
      const { error } = await supabase.from('leads').delete().eq('id', prospect.id)
      if (error) throw error
      toast({
        title: t('prospectDetail.toasts.deleted.title'),
        description: t('prospectDetail.toasts.deleted.description'),
      })
      navigate('/pipeline')
    } catch (error: any) {
      console.error('Error deleting prospect:', error)
      toast({
        title: t('common.error'),
        description: error?.message || t('prospectDetail.toasts.deleteError.description'),
        variant: 'destructive',
      })
    } finally {
      setProcessingAction(false)
      setConfirmAction(null)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'won': return 'default'
      case 'lost': return 'destructive'
      case 'negotiation': return 'secondary'
      default: return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!prospect) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('prospectDetail.notFound')}</h1>
          <Link to="/prospects">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('prospectDetail.backToProspects')}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/prospects">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('prospectDetail.back')}
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              {`${prospect.first_name || ''} ${prospect.last_name || ''}`.trim()} — {prospect.company_name}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              {stages.length > 0 ? (
                <Select
                  value={prospect.stage_id || stages[0]?.id}
                  onValueChange={handleUpdateStageId}
                >
                  <SelectTrigger className="w-56 h-8">
                    <SelectValue placeholder={t('prospectDetail.stageSelect.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant={getStatusBadgeVariant(prospect.prospect_status)}>
                  {t(`crm.statuses.${prospect.prospect_status}`)}
                </Badge>
              )}
              <Badge variant="outline">
                {prospect.campaigns?.name}
              </Badge>
              {prospect.country && (
                <Badge variant="secondary">
                  {prospect.country}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={prospect.prospect_status} onValueChange={handleUpdateStatus}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROSPECT_STATUS_KEYS.map((key) => (
                <SelectItem key={key} value={key}>{t(`crm.statuses.${key}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => setEditing(!editing)}>
            <Edit className="w-4 h-4 mr-2" />
            {editing ? t('prospectDetail.cancel') : t('prospectDetail.edit')}
          </Button>

          {editing && (
            <Button onClick={handleSaveChanges}>
              {t('prospectDetail.save')}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label={t('common.actions')}>
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setConfirmAction('archive')}>
                <Archive className="w-4 h-4 mr-2" />
                {t('prospectDetail.menu.archive')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setConfirmAction('delete')}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('prospectDetail.menu.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'delete'
                ? t('prospectDetail.confirmDelete.title')
                : t('prospectDetail.confirmArchive.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'delete'
                ? t('prospectDetail.confirmDelete.description')
                : t('prospectDetail.confirmArchive.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingAction}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={processingAction}
              onClick={(e) => {
                e.preventDefault()
                if (confirmAction === 'delete') handleDelete()
                else if (confirmAction === 'archive') handleArchive()
              }}
              className={confirmAction === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {confirmAction === 'delete' ? t('prospectDetail.menu.delete') : t('prospectDetail.menu.archive')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle>{t('prospectDetail.contact.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('prospectDetail.contact.firstName')}</Label>
                    <Input
                      value={prospect.first_name || ''}
                      onChange={(e) => setProspect(prev => prev ? { ...prev, first_name: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label>{t('prospectDetail.contact.lastName')}</Label>
                    <Input
                      value={prospect.last_name || ''}
                      onChange={(e) => setProspect(prev => prev ? { ...prev, last_name: e.target.value } : null)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>{t('prospectDetail.contact.company')}</Label>
                    <Input
                      value={prospect.company_name || ''}
                      onChange={(e) => setProspect(prev => prev ? { ...prev, company_name: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label>{t('prospectDetail.contact.email')}</Label>
                    <Input
                      type="email"
                      value={prospect.email || ''}
                      onChange={(e) => setProspect(prev => prev ? { ...prev, email: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label>{t('prospectDetail.contact.phone')}</Label>
                    <Input
                      value={prospect.phone || ''}
                      onChange={(e) => setProspect(prev => prev ? { ...prev, phone: e.target.value } : null)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>{t('prospectDetail.contact.website')}</Label>
                    <Input
                      value={prospect.website_url || ''}
                      onChange={(e) => setProspect(prev => prev ? { ...prev, website_url: e.target.value } : null)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>{t('prospectDetail.contact.address')}</Label>
                    <Input
                      value={prospect.address_line1 || ''}
                      onChange={(e) => setProspect(prev => prev ? { ...prev, address_line1: e.target.value } : null)}
                      placeholder={t('prospectDetail.contact.addressLine1')}
                      className="mb-2"
                    />
                    <Input
                      value={prospect.address_line2 || ''}
                      onChange={(e) => setProspect(prev => prev ? { ...prev, address_line2: e.target.value } : null)}
                      placeholder={t('prospectDetail.contact.addressLine2')}
                    />
                  </div>
                  <div>
                    <Label>{t('prospectDetail.contact.city')}</Label>
                    <Input
                      value={prospect.city || ''}
                      onChange={(e) => setProspect(prev => prev ? { ...prev, city: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label>{t('prospectDetail.contact.postal')}</Label>
                    <Input
                      value={prospect.postal_code || ''}
                      onChange={(e) => setProspect(prev => prev ? { ...prev, postal_code: e.target.value } : null)}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <strong>{t('prospectDetail.contact.contact')}:</strong> {`${prospect.first_name || ''} ${prospect.last_name || ''}`.trim()}
                  </div>
                  <div className="flex items-center gap-2">
                    <strong>{t('prospectDetail.contact.company')}:</strong> {prospect.company_name}
                  </div>
                  {prospect.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <a href={`mailto:${prospect.email}?subject=${encodeURIComponent(t('prospectDetail.contact.emailSubject', { company: prospect.company_name || '' }))}`}
                         className="text-primary hover:underline">
                        {prospect.email}
                      </a>
                    </div>
                  )}
                  {prospect.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <a href={`tel:${prospect.phone}`} className="text-primary hover:underline">
                        {prospect.phone}
                      </a>
                    </div>
                  )}
                  {prospect.website_url && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      <a href={prospect.website_url} target="_blank" rel="noopener noreferrer" 
                         className="text-primary hover:underline">
                        {prospect.website_url}
                      </a>
                    </div>
                  )}
                  {(prospect.address_line1 || prospect.city) && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5" />
                      <div>
                        {prospect.address_line1 && <div>{prospect.address_line1}</div>}
                        {prospect.address_line2 && <div>{prospect.address_line2}</div>}
                        {prospect.city && (
                          <div>
                            {prospect.postal_code && `${prospect.postal_code} `}
                            {prospect.city}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4">
                <Button 
                  className="w-full"
                  onClick={() => {
                    if (prospect.email) {
                      window.location.href = `mailto:${prospect.email}?subject=${encodeURIComponent(t('prospectDetail.contact.emailSubject', { company: prospect.company_name || '' }))}`
                    }
                  }}
                  disabled={!prospect.email}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {t('prospectDetail.contact.sendEmail')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Requested Actions */}
          <Card>
            <CardHeader>
              <CardTitle>{t('prospectDetail.requested.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {REQUESTED_ACTION_KEYS.map((key) => (
                  <div key={key} className="flex items-center space-x-3">
                    <Checkbox
                      checked={prospect.requested_actions?.includes(key) || false}
                      onCheckedChange={(checked) => editing && handleRequestedActionChange(key, !!checked)}
                      disabled={!editing}
                    />
                    <Label className={!editing ? 'cursor-default' : ''}>{t(`prospectDetail.actions.${key}`)}</Label>
                  </div>
                ))}
                {prospect.requested_other && (
                  <div className="pt-2">
                    <Label>{t('prospectDetail.requested.otherLabel')}</Label>
                    {editing ? (
                      <Textarea
                        value={prospect.requested_other}
                        onChange={(e) => setProspect(prev => prev ? { ...prev, requested_other: e.target.value } : null)}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">{prospect.requested_other}</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Samples */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('prospectDetail.samples.title')}</CardTitle>
                <Dialog open={showAddSample} onOpenChange={setShowAddSample}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      {t('prospectDetail.samples.addWine')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('prospectDetail.samples.dialogTitle')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>{t('prospectDetail.samples.wineLabel')}</Label>
                        <Select value={newSample.wine_id} onValueChange={(value) => setNewSample(prev => ({ ...prev, wine_id: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('prospectDetail.samples.winePlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            {wines.map(wine => (
                              <SelectItem key={wine.id} value={wine.id}>
                                {wine.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{t('prospectDetail.samples.quantity')}</Label>
                        <Input
                          type="number"
                          min="1"
                          value={newSample.quantity}
                          onChange={(e) => setNewSample(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                        />
                      </div>
                      <div>
                        <Label>{t('prospectDetail.samples.comment')}</Label>
                        <Textarea
                          value={newSample.comment}
                          onChange={(e) => setNewSample(prev => ({ ...prev, comment: e.target.value }))}
                          placeholder={t('prospectDetail.samples.commentPlaceholder')}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowAddSample(false)}>
                        {t('prospectDetail.samples.cancel')}
                      </Button>
                      <Button onClick={handleAddSample} disabled={!newSample.wine_id}>
                        {t('prospectDetail.samples.add')}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {sampleItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  {t('prospectDetail.samples.empty')}
                </p>
              ) : (
                <div className="space-y-3">
                  {sampleItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{item.wines?.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {t('prospectDetail.samples.quantityLabel', { q: item.quantity })}
                          {item.comment && ` • ${item.comment}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {sampleItems.length > 0 && prospect.prospect_status !== 'samples_sent' && (
                <div className="pt-4">
                  <Button onClick={handleMarkSamplesSent} className="w-full">
                    {t('prospectDetail.samples.markSent')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Status Management */}
          {(prospect.prospect_status === 'won' || prospect.prospect_status === 'lost') && (
            <Card>
              <CardHeader>
                <CardTitle>{t('prospectDetail.commercial.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {prospect.prospect_status === 'won' && (
                  <div>
                    <Label>{t('prospectDetail.commercial.estimatedAmount')}</Label>
                    {editing ? (
                      <Input
                        type="number"
                        value={prospect.estimated_amount || ''}
                        onChange={(e) => setProspect(prev => prev ? { ...prev, estimated_amount: parseFloat(e.target.value) || 0 } : null)}
                      />
                    ) : (
                      <p className="text-lg font-semibold text-green-600">
                        {prospect.estimated_amount ? formatCurrency(prospect.estimated_amount, 'EUR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : t('prospectDetail.commercial.notSet')}
                      </p>
                    )}
                  </div>
                )}

                {prospect.prospect_status === 'lost' && (
                  <div>
                    <Label>{t('prospectDetail.commercial.lostReason')}</Label>
                    {editing ? (
                      <Textarea
                        value={prospect.lost_reason || ''}
                        onChange={(e) => setProspect(prev => prev ? { ...prev, lost_reason: e.target.value } : null)}
                        placeholder={t('prospectDetail.commercial.lostPlaceholder')}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {prospect.lost_reason || t('prospectDetail.commercial.noReason')}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>{t('prospectDetail.notes.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Textarea
                  placeholder={t('prospectDetail.notes.placeholder')}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <Button 
                  className="w-full mt-2" 
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {t('prospectDetail.notes.addBtn')}
                </Button>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {notes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4 text-sm">
                    {t('prospectDetail.notes.empty')}
                  </p>
                ) : (
                  notes.map(note => (
                    <div key={note.id} className="p-3 bg-muted rounded-lg">
                      <p className="text-sm">{note.body}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDateTime(note.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tally Reference */}
          {(prospect.tally_response_id || prospect.tally_response_url) && (
            <Card>
              <CardHeader>
                <CardTitle>{t('prospectDetail.tally.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {prospect.tally_response_id && (
                  <div>
                    <Label>{t('prospectDetail.tally.responseId')}</Label>
                    <p className="text-sm font-mono">{prospect.tally_response_id}</p>
                  </div>
                )}
                {prospect.tally_response_url && (
                  <div>
                    <a 
                      href={prospect.tally_response_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {t('prospectDetail.tally.viewResponse')}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline/History */}
          <Card>
            <CardHeader>
              <CardTitle>{t('prospectDetail.history.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <div>
                    <div>{t('prospectDetail.history.created')}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(prospect.created_at)}
                    </div>
                  </div>
                </div>
                {prospect.last_activity_at && prospect.last_activity_at !== prospect.created_at && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-secondary rounded-full"></div>
                    <div>
                      <div>{t('prospectDetail.history.lastUpdate')}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(prospect.last_activity_at)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}