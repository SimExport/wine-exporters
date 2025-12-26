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
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, GripVertical, Building2, Mail, MapPin } from 'lucide-react'
import { format } from 'date-fns'
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
}

const PIPELINE_STATUSES = [
  { key: 'new', label: 'À classer', color: 'bg-slate-100 dark:bg-slate-800' },
  { key: 'samples_requested', label: 'Échantillons à envoyer', color: 'bg-amber-50 dark:bg-amber-950' },
  { key: 'samples_sent', label: 'Échantillons envoyés', color: 'bg-blue-50 dark:bg-blue-950' },
  { key: 'received', label: 'Échantillons réceptionnés', color: 'bg-indigo-50 dark:bg-indigo-950' },
  { key: 'tasted', label: 'Échantillons dégustés', color: 'bg-purple-50 dark:bg-purple-950' },
  { key: 'negotiation', label: 'Négociation', color: 'bg-orange-50 dark:bg-orange-950' },
  { key: 'won', label: 'Commande', color: 'bg-green-50 dark:bg-green-950' },
  { key: 'lost', label: 'Refus', color: 'bg-red-50 dark:bg-red-950' },
]

const REQUESTED_ACTION_LABELS = {
  price_list: 'Liste de prix',
  samples: 'Échantillons',
  video_call: 'Visioconférence',
  tech_sheets: 'Fiches techniques',
  other: 'Autre'
}

export default function Pipeline() {
  const { user } = useAuth()
  const { toast } = useToast()
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
    country: '',
    requested_actions: [] as string[],
    tally_response_url: ''
  })

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

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
        title: "Erreur",
        description: "Impossible de charger les données",
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
        title: "Statut mis à jour",
        description: "Le prospect a été déplacé",
      })

    } catch (error) {
      console.error('Error updating status:', error)
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
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
          title: "Prospect existant",
          description: "Un prospect avec cet email existe déjà pour cette campagne",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase
        .from('leads')
        .insert({
          ...newProspect,
          buyer_id: newProspect.email || 'unknown',
          market: newProspect.country || 'unknown',
          prospect_status: 'new' as any,
          last_activity_at: new Date().toISOString(),
          created_by: user?.id,
          requested_actions: newProspect.requested_actions as any
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
        country: '',
        requested_actions: [],
        tally_response_url: ''
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
            <h1 className="text-3xl font-bold">Pipeline</h1>
            <p className="text-muted-foreground">Vue Kanban de vos prospects</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/prospects">Vue liste</Link>
            </Button>
            
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

                  <div>
                    <Label>Actions demandées</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {Object.entries(REQUESTED_ACTION_LABELS).map(([key, label]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`pipeline-${key}`}
                            checked={newProspect.requested_actions.includes(key)}
                            onCheckedChange={(checked) => handleRequestedActionChange(key, !!checked)}
                          />
                          <Label htmlFor={`pipeline-${key}`} className="text-sm">{label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="tally_url">URL Tally (optionnel)</Label>
                    <Input
                      value={newProspect.tally_response_url}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, tally_response_url: e.target.value }))}
                      placeholder="https://tally.so/..."
                    />
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
                    Créer le prospect
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STATUSES.map(status => {
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
                    <h3 className="font-semibold text-sm">{status.label}</h3>
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
                              <Link 
                                to={`/prospects/${prospect.id}`}
                                className="font-medium text-sm hover:underline block truncate"
                              >
                                {prospect.company_name || 'Sans nom'}
                              </Link>
                              
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
                                      {REQUESTED_ACTION_LABELS[action as keyof typeof REQUESTED_ACTION_LABELS]}
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
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {statusProspects.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        Aucun prospect
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
