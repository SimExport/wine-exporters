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
  ArrowLeft, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  Plus, 
  Edit, 
  Trash2,
  ExternalLink,
  MessageSquare
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

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
  price_list: 'Recevoir la liste de prix',
  samples: 'Demander des échantillons',
  video_call: 'Planifier une visio',
  tech_sheets: 'Recevoir fiches techniques',
  other: 'Autre'
}

export default function ProspectDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [prospect, setProspect] = useState<Prospect | null>(null)
  const [sampleItems, setSampleItems] = useState<SampleItem[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [wines, setWines] = useState<Wine[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [showAddSample, setShowAddSample] = useState(false)
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

      // Load user's wines for sample selection
      const { data: winesData } = await supabase
        .from('wines')
        .select('id, name')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('name')

      setWines(winesData || [])

    } catch (error) {
      console.error('Error loading prospect:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du prospect",
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
        title: "Montant requis",
        description: "Le montant estimé est requis pour marquer comme gagné",
        variant: "destructive",
      })
      return
    }

    if (newStatus === 'lost' && !prospect.lost_reason) {
      toast({
        title: "Raison requise",
        description: "La raison de perte est requise",
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
        title: "Statut mis à jour",
        description: `Statut changé vers "${PROSPECT_STATUS_LABELS[newStatus as keyof typeof PROSPECT_STATUS_LABELS]}"`,
      })

    } catch (error) {
      console.error('Error updating status:', error)
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      })
    }
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
        title: "Note ajoutée",
        description: "La note a été enregistrée",
      })

    } catch (error) {
      console.error('Error adding note:', error)
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter la note",
        variant: "destructive",
      })
    }
  }

  const handleAddSample = async () => {
    if (!newSample.wine_id || !prospect) return

    try {
      const { data, error } = await supabase
        .from('sample_items')
        .insert({
          lead_id: prospect.id,
          wine_id: newSample.wine_id,
          quantity: newSample.quantity,
          comment: newSample.comment
        })
        .select(`
          *,
          wines(name)
        `)
        .single()

      if (error) throw error

      setSampleItems(prev => [data, ...prev])
      setNewSample({ wine_id: '', quantity: 1, comment: '' })
      setShowAddSample(false)

      toast({
        title: "Échantillon ajouté",
        description: "L'échantillon a été ajouté à la demande",
      })

    } catch (error) {
      console.error('Error adding sample:', error)
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'échantillon",
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
        title: "Modifications sauvegardées",
        description: "Les informations ont été mises à jour",
      })

    } catch (error) {
      console.error('Error saving changes:', error)
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les modifications",
        variant: "destructive",
      })
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
          <h1 className="text-2xl font-bold mb-4">Prospect non trouvé</h1>
          <Link to="/prospects">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux prospects
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
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              {`${prospect.first_name || ''} ${prospect.last_name || ''}`.trim()} — {prospect.company_name}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={getStatusBadgeVariant(prospect.prospect_status)}>
                {PROSPECT_STATUS_LABELS[prospect.prospect_status as keyof typeof PROSPECT_STATUS_LABELS]}
              </Badge>
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
              {Object.entries(PROSPECT_STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => setEditing(!editing)}>
            <Edit className="w-4 h-4 mr-2" />
            {editing ? 'Annuler' : 'Éditer'}
          </Button>

          {editing && (
            <Button onClick={handleSaveChanges}>
              Sauvegarder
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle>Coordonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Prénom</Label>
                    <Input
                      value={prospect.first_name || ''}
                      onChange={(e) => setProspect(prev => prev ? { ...prev, first_name: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label>Nom</Label>
                    <Input
                      value={prospect.last_name || ''}
                      onChange={(e) => setProspect(prev => prev ? { ...prev, last_name: e.target.value } : null)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Société</Label>
                    <Input
                      value={prospect.company_name || ''}
                      onChange={(e) => setProspect(prev => prev ? { ...prev, company_name: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={prospect.email || ''}
                      onChange={(e) => setProspect(prev => prev ? { ...prev, email: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label>Téléphone</Label>
                    <Input
                      value={prospect.phone || ''}
                      onChange={(e) => setProspect(prev => prev ? { ...prev, phone: e.target.value } : null)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Site web</Label>
                    <Input
                      value={prospect.website_url || ''}
                      onChange={(e) => setProspect(prev => prev ? { ...prev, website_url: e.target.value } : null)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Adresse</Label>
                    <Input
                      value={prospect.address_line1 || ''}
                      onChange={(e) => setProspect(prev => prev ? { ...prev, address_line1: e.target.value } : null)}
                      placeholder="Ligne 1"
                      className="mb-2"
                    />
                    <Input
                      value={prospect.address_line2 || ''}
                      onChange={(e) => setProspect(prev => prev ? { ...prev, address_line2: e.target.value } : null)}
                      placeholder="Ligne 2"
                    />
                  </div>
                  <div>
                    <Label>Ville</Label>
                    <Input
                      value={prospect.city || ''}
                      onChange={(e) => setProspect(prev => prev ? { ...prev, city: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label>Code postal</Label>
                    <Input
                      value={prospect.postal_code || ''}
                      onChange={(e) => setProspect(prev => prev ? { ...prev, postal_code: e.target.value } : null)}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <strong>Contact:</strong> {`${prospect.first_name || ''} ${prospect.last_name || ''}`.trim()}
                  </div>
                  <div className="flex items-center gap-2">
                    <strong>Société:</strong> {prospect.company_name}
                  </div>
                  {prospect.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <a href={`mailto:${prospect.email}?subject=[Performance Export] ${prospect.company_name} — suite à votre intérêt`} 
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
                <Button className="w-full">
                  <Mail className="w-4 h-4 mr-2" />
                  Envoyer un email
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Requested Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions demandées</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(REQUESTED_ACTION_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center space-x-3">
                    <Checkbox
                      checked={prospect.requested_actions?.includes(key) || false}
                      onCheckedChange={(checked) => editing && handleRequestedActionChange(key, !!checked)}
                      disabled={!editing}
                    />
                    <Label className={!editing ? 'cursor-default' : ''}>{label}</Label>
                  </div>
                ))}
                {prospect.requested_other && (
                  <div className="pt-2">
                    <Label>Autre demande:</Label>
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
                <CardTitle>Échantillons demandés</CardTitle>
                <Dialog open={showAddSample} onOpenChange={setShowAddSample}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter un vin
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter un échantillon</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Cuvée</Label>
                        <Select value={newSample.wine_id} onValueChange={(value) => setNewSample(prev => ({ ...prev, wine_id: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un vin" />
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
                        <Label>Quantité</Label>
                        <Input
                          type="number"
                          min="1"
                          value={newSample.quantity}
                          onChange={(e) => setNewSample(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                        />
                      </div>
                      <div>
                        <Label>Commentaire</Label>
                        <Textarea
                          value={newSample.comment}
                          onChange={(e) => setNewSample(prev => ({ ...prev, comment: e.target.value }))}
                          placeholder="Notes sur cet échantillon..."
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowAddSample(false)}>
                        Annuler
                      </Button>
                      <Button onClick={handleAddSample} disabled={!newSample.wine_id}>
                        Ajouter
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {sampleItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Aucun échantillon demandé
                </p>
              ) : (
                <div className="space-y-3">
                  {sampleItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{item.wines?.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Quantité: {item.quantity}
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
                    Marquer "Échantillons envoyés"
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
                <CardTitle>Suivi commercial</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {prospect.prospect_status === 'won' && (
                  <div>
                    <Label>Montant estimé (€)</Label>
                    {editing ? (
                      <Input
                        type="number"
                        value={prospect.estimated_amount || ''}
                        onChange={(e) => setProspect(prev => prev ? { ...prev, estimated_amount: parseFloat(e.target.value) || 0 } : null)}
                      />
                    ) : (
                      <p className="text-lg font-semibold text-green-600">
                        {prospect.estimated_amount ? `${prospect.estimated_amount.toLocaleString()} €` : 'Non renseigné'}
                      </p>
                    )}
                  </div>
                )}

                {prospect.prospect_status === 'lost' && (
                  <div>
                    <Label>Raison de perte</Label>
                    {editing ? (
                      <Textarea
                        value={prospect.lost_reason || ''}
                        onChange={(e) => setProspect(prev => prev ? { ...prev, lost_reason: e.target.value } : null)}
                        placeholder="Pourquoi ce prospect a-t-il été perdu ?"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {prospect.lost_reason || 'Raison non renseignée'}
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
              <CardTitle>Notes internes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Textarea
                  placeholder="Ajouter une note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <Button 
                  className="w-full mt-2" 
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Ajouter note
                </Button>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {notes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4 text-sm">
                    Aucune note pour l'instant
                  </p>
                ) : (
                  notes.map(note => (
                    <div key={note.id} className="p-3 bg-muted rounded-lg">
                      <p className="text-sm">{note.body}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(note.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
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
                <CardTitle>Référence Tally</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {prospect.tally_response_id && (
                  <div>
                    <Label>ID Réponse</Label>
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
                      Voir la réponse Tally
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline/History */}
          <Card>
            <CardHeader>
              <CardTitle>Historique</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <div>
                    <div>Prospect créé</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(prospect.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                    </div>
                  </div>
                </div>
                {prospect.last_activity_at && prospect.last_activity_at !== prospect.created_at && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-secondary rounded-full"></div>
                    <div>
                      <div>Dernière mise à jour</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(prospect.last_activity_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
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