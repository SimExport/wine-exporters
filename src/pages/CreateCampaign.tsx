import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Stepper } from '@/components/ui/stepper';
import { CampaignSidebar } from '@/components/campaign-wizard/CampaignSidebar';
import { PreflightBar } from '@/components/campaign-wizard/PreflightBar';
import { ArrowLeft, ArrowRight, Save, Rocket, ExternalLink, FileText, Plus, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Document {
  id: string;
  title: string;
  category: string;
  file_url: string;
  file_name: string;
}

interface Wine {
  id: string;
  name: string;
  appellation?: string;
  color: string;
  exw_price_eur: number;
  vintages?: number[];
  is_active: boolean;
}

interface CampaignData {
  id?: string;
  name: string;
  // Step 1
  markets: string[];
  channels: string[];
  segments: string[];
  volumeBand: string;
  priceMin: number | null;
  priceMax: number | null;
  language: string;
  excludeRecentDays: number;
  blacklistBuyerIds: string[];
  audienceEstimate: number;
  // Step 2
  cuvees: string[]; // Keep for backward compatibility
  selectedWines: string[]; // New wine IDs array
  presentationDocId: string | null;
  pricelistDocId: string | null;
  techDocsIds: string[];
  techsLink: string;
  // Step 3
  sendAsName: string;
  replyTo: string;
  subjectVariants: string[];
  subjectSelected: string;
  messageHtml: string;
  messageText: string;
  sequenceEnabled: boolean;
  seq2DelayDays: number;
  seq3DelayDays: number;
  // Step 4
  scheduleAt: Date | null;
  sendNow: boolean;
  dailyCap: number;
  managedByBo: boolean;
  status: string;
}

const CreateCampaign = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([]);
  const [availableCuvees, setAvailableCuvees] = useState<string[]>([]);
  const [availableWines, setAvailableWines] = useState<Wine[]>([]);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  const [campaignData, setCampaignData] = useState<CampaignData>({
    name: '',
    markets: [],
    channels: [],
    segments: [],
    volumeBand: '',
    priceMin: null,
    priceMax: null,
    language: 'FR',
    excludeRecentDays: 90,
    blacklistBuyerIds: [],
    audienceEstimate: 0,
    cuvees: [],
    selectedWines: [],
    presentationDocId: null,
    pricelistDocId: null,
    techDocsIds: [],
    techsLink: '',
    sendAsName: '',
    replyTo: '',
    subjectVariants: [],
    subjectSelected: '',
    messageHtml: '',
    messageText: '',
    sequenceEnabled: true,
    seq2DelayDays: 3,
    seq3DelayDays: 10,
    scheduleAt: null,
    sendNow: true,
    dailyCap: 200,
    managedByBo: false,
    status: 'draft'
  });

  const steps = ['Marchés & ciblage', 'Vins & documents', 'Message & envoi', 'Relecture & lancement'];

  const markets = {
    'Europe': [
      'France', 'Allemagne', 'Italie', 'Espagne', 'Royaume-Uni', 
      'Pays-Bas', 'Belgique', 'Suisse', 'Autriche', 'Suède'
    ],
    'Amérique du Nord': [
      'États-Unis', 'Canada', 'Mexique'
    ],
    'Asie': [
      'Japon', 'Chine', 'Corée du Sud', 'Singapour', 'Hong Kong', 
      'Thaïlande', 'Vietnam', 'Malaisie'
    ]
  };

  const channelOptions = ['Importateur', 'Distributeur', 'Caviste/Indépendant', 'On-trade (Horeca)', 'Online'];
  const segmentOptions = ['Bio/Conversion', 'Premium', 'MDD', 'Entrée de gamme', 'Milieu de gamme', 'Haut de gamme'];
  const volumeBandOptions = ['<3k bouteilles/an', '3-10k bouteilles/an', '10-50k bouteilles/an', '50k+ bouteilles/an'];

  // Load initial data
  useEffect(() => {
    if (user) {
      loadDocuments();
      loadProfile();
      loadWines();
      loadUserSettings();
    }
  }, [user]);

  // Auto-save functionality
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    const timer = setTimeout(saveDraft, 1000);
    setAutoSaveTimer(timer);
  }, [autoSaveTimer]);

  const updateCampaignData = (updates: Partial<CampaignData>) => {
    setCampaignData(prev => ({ ...prev, ...updates }));
    triggerAutoSave();
  };

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user?.id);
      
      if (error) throw error;
      setAvailableDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('cuvees, domain_name')
        .eq('user_id', user?.id)
        .single();
      
      if (error) throw error;
      if (data) {
        setAvailableCuvees(data.cuvees || []);
        updateCampaignData({ 
          sendAsName: data.domain_name || '',
          name: `Campagne - ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadWines = async () => {
    try {
      const { data, error } = await supabase
        .from('wines')
        .select('id, name, appellation, color, exw_price_eur, vintages, is_active')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setAvailableWines(data || []);
    } catch (error) {
      console.error('Error loading wines:', error);
    }
  };

  const loadUserSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('reply_to_default, display_name')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (error) throw error;

      if (data?.reply_to_default && !campaignData.replyTo) {
        updateCampaignData({ 
          replyTo: data.reply_to_default,
          sendAsName: data.display_name || campaignData.sendAsName
        });
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  };

  const saveDraft = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        name: campaignData.name,
        target_markets: campaignData.markets,
        channels: campaignData.channels,
        segments: campaignData.segments,
        volume_band: campaignData.volumeBand,
        price_min: campaignData.priceMin,
        price_max: campaignData.priceMax,
        language: campaignData.language,
        exclude_recent_days: campaignData.excludeRecentDays,
        blacklist_buyer_ids: campaignData.blacklistBuyerIds,
        cuvees: campaignData.cuvees,
        selected_wines: campaignData.selectedWines,
        doc_presentation: campaignData.presentationDocId,
        doc_pricelist: campaignData.pricelistDocId,
        doc_techs: campaignData.techDocsIds,
        techs_link: campaignData.techsLink,
        send_as_name: campaignData.sendAsName,
        reply_to: campaignData.replyTo,
        subject_variants: campaignData.subjectVariants,
        subject_selected: campaignData.subjectSelected,
        message_html: campaignData.messageHtml,
        message_text: campaignData.messageText,
        sequence_enabled: campaignData.sequenceEnabled,
        seq2_delay_days: campaignData.seq2DelayDays,
        seq3_delay_days: campaignData.seq3DelayDays,
        schedule_at: campaignData.scheduleAt?.toISOString(),
        send_now: campaignData.sendNow,
        daily_cap: campaignData.dailyCap,
        managed_by_bo: campaignData.managedByBo,
        audience_estimate: campaignData.audienceEstimate,
        status: campaignData.status
      };

      if (campaignData.id) {
        const { error } = await supabase
          .from('campaigns')
          .update(payload)
          .eq('id', campaignData.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('campaigns')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setCampaignData(prev => ({ ...prev, id: data.id }));
      }
      
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleMarketToggle = (market: string) => {
    const newMarkets = campaignData.markets.includes(market)
      ? campaignData.markets.filter(m => m !== market)
      : [...campaignData.markets, market];
    
    updateCampaignData({ markets: newMarkets });
    // Simulate audience calculation
    updateCampaignData({ audienceEstimate: Math.max(10, Math.min(500, newMarkets.length * 45)) });
  };

  const getPreflightErrors = () => {
    const errors = [];
    
    if (campaignData.markets.length === 0) {
      errors.push({ id: 'markets', message: 'Au moins 1 marché requis', anchor: 'step-1' });
    }
    
    if (campaignData.audienceEstimate < 20 || campaignData.audienceEstimate > 500) {
      errors.push({ id: 'audience', message: 'Audience entre 20 et 500 contacts', anchor: 'step-1' });
    }
    
    if (campaignData.selectedWines.length === 0 && campaignData.cuvees.length === 0) {
      errors.push({ id: 'cuvees', message: 'Au moins 1 cuvée requise', anchor: 'step-2' });
    }
    
    if (!campaignData.presentationDocId) {
      errors.push({ id: 'presentation', message: 'Document de présentation requis', anchor: 'step-2' });
    }
    
    if (!campaignData.pricelistDocId) {
      errors.push({ id: 'pricelist', message: 'Liste des prix requise', anchor: 'step-2' });
    }
    
    if (!campaignData.sendAsName) {
      errors.push({ id: 'sender', message: 'Expéditeur requis', anchor: 'step-3' });
    }
    
    if (!campaignData.subjectSelected) {
      errors.push({ id: 'subject', message: 'Objet requis', anchor: 'step-3' });
    }
    
    return errors;
  };

  const generateSubjectVariants = () => {
    const variants = [
      `Sélection AOC - ouverture de marché ${campaignData.markets[0] || '[Pays]'}`,
      `${campaignData.sendAsName} — cuvées disponibles & tarifs export`,
      `Import ${campaignData.markets[0] || '[Pays]'} — dégustation échantillons possible`
    ];
    updateCampaignData({ subjectVariants: variants });
  };

  const getSelectedCuveeNames = () => {
    if (campaignData.selectedWines.length > 0) {
      return availableWines
        .filter(wine => campaignData.selectedWines.includes(wine.id))
        .map(wine => wine.name);
    }
    return campaignData.cuvees;
  };

  const launchCampaign = async () => {
    const errors = getPreflightErrors();
    if (errors.length > 0) {
      toast({
        title: "Erreurs à corriger",
        description: "Veuillez corriger les erreurs avant de lancer la campagne.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Update campaign status
      await supabase
        .from('campaigns')
        .update({ status: 'pending' })
        .eq('id', campaignData.id);

      // Send webhook to Make.com (reuse existing endpoint if configured)
      const webhookPayload = {
        campaign_id: campaignData.id,
        winery_id: user?.id,
        markets: campaignData.markets,
        channels: campaignData.channels,
        segments: campaignData.segments,
        volume_band: campaignData.volumeBand,
        price_min: campaignData.priceMin,
        price_max: campaignData.priceMax,
        language: campaignData.language,
        exclude_recent_days: campaignData.excludeRecentDays,
        blacklist_buyer_ids: campaignData.blacklistBuyerIds,
        cuvees: getSelectedCuveeNames(),
        doc_urls: {
          presentation: availableDocuments.find(d => d.id === campaignData.presentationDocId)?.file_url,
          pricelist: availableDocuments.find(d => d.id === campaignData.pricelistDocId)?.file_url,
          techs: campaignData.techDocsIds.map(id => availableDocuments.find(d => d.id === id)?.file_url).filter(Boolean),
          techs_link: campaignData.techsLink
        },
        sender: {
          send_as_name: campaignData.sendAsName,
          reply_to: campaignData.replyTo
        },
        subject: campaignData.subjectSelected,
        message_html: campaignData.messageHtml,
        message_text: campaignData.messageText,
        sequence: {
          enabled: campaignData.sequenceEnabled,
          seq2_delay_days: campaignData.seq2DelayDays,
          seq3_delay_days: campaignData.seq3DelayDays
        },
        schedule_at: campaignData.scheduleAt,
        daily_cap: campaignData.dailyCap,
        managed_by_bo: campaignData.managedByBo
      };

      // TODO: Add actual webhook URL when configured
      console.log('Webhook payload:', webhookPayload);

      toast({
        title: "Campagne lancée !",
        description: "Votre campagne est en cours de traitement.",
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error launching campaign:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du lancement.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderStep1();
      case 1:
        return renderStep2();
      case 2:
        return renderStep3();
      case 3:
        return renderStep4();
      default:
        return null;
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6" id="step-1">
      <div>
        <Label htmlFor="campaignName">Nom de la campagne</Label>
        <Input
          id="campaignName"
          value={campaignData.name}
          onChange={(e) => updateCampaignData({ name: e.target.value })}
          placeholder="Ex: Campagne Printemps 2024"
          className="mt-1"
        />
      </div>

      <div>
        <Label className="text-base font-semibold">
          Marchés prioritaires ({campaignData.markets.length} sélectionnés)
        </Label>
        {Object.entries(markets).map(([region, countryList]) => (
          <div key={region} className="mb-6">
            <h3 className="font-semibold text-lg mb-3">{region}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {countryList.map((country) => (
                <div key={country} className="flex items-center space-x-2">
                  <Checkbox
                    id={country}
                    checked={campaignData.markets.includes(country)}
                    onCheckedChange={() => handleMarketToggle(country)}
                  />
                  <Label htmlFor={country} className="text-sm">
                    {country}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label className="text-base font-semibold">Canaux</Label>
          <div className="space-y-2 mt-2">
            {channelOptions.map((channel) => (
              <div key={channel} className="flex items-center space-x-2">
                <Checkbox
                  id={channel}
                  checked={campaignData.channels.includes(channel)}
                  onCheckedChange={(checked) => {
                    const newChannels = checked
                      ? [...campaignData.channels, channel]
                      : campaignData.channels.filter(c => c !== channel);
                    updateCampaignData({ channels: newChannels });
                  }}
                />
                <Label htmlFor={channel} className="text-sm">{channel}</Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-base font-semibold">Segments</Label>
          <div className="space-y-2 mt-2">
            {segmentOptions.map((segment) => (
              <div key={segment} className="flex items-center space-x-2">
                <Checkbox
                  id={segment}
                  checked={campaignData.segments.includes(segment)}
                  onCheckedChange={(checked) => {
                    const newSegments = checked
                      ? [...campaignData.segments, segment]
                      : campaignData.segments.filter(s => s !== segment);
                    updateCampaignData({ segments: newSegments });
                  }}
                />
                <Label htmlFor={segment} className="text-sm">{segment}</Label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="volumeBand">Volumes souhaités</Label>
          <Select value={campaignData.volumeBand} onValueChange={(value) => updateCampaignData({ volumeBand: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez" />
            </SelectTrigger>
            <SelectContent>
              {volumeBandOptions.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="priceMin">Prix min. (€)</Label>
          <Input
            id="priceMin"
            type="number"
            value={campaignData.priceMin || ''}
            onChange={(e) => updateCampaignData({ priceMin: e.target.value ? parseFloat(e.target.value) : null })}
            placeholder="0"
          />
        </div>

        <div>
          <Label htmlFor="priceMax">Prix max. (€)</Label>
          <Input
            id="priceMax"
            type="number"
            value={campaignData.priceMax || ''}
            onChange={(e) => updateCampaignData({ priceMax: e.target.value ? parseFloat(e.target.value) : null })}
            placeholder="100"
          />
        </div>
      </div>

      {campaignData.audienceEstimate > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>≈ {campaignData.audienceEstimate} contacts trouvés</strong>
            {campaignData.audienceEstimate < 20 && (
              <span className="text-red-600 block">
                Audience trop faible. Ajustez vos filtres.
              </span>
            )}
            {campaignData.audienceEstimate > 500 && (
              <span className="text-red-600 block">
                Audience trop large. Ajustez vos filtres.
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6" id="step-2">
      <div>
        <Label className="text-base font-semibold">Sélection des cuvées</Label>
        
        {availableWines.length > 0 ? (
          <div className="space-y-3 mt-4">
            {availableWines.map((wine) => {
              const displayText = `${wine.name}${wine.appellation ? ` - ${wine.appellation}` : ''} - ${wine.color} - ${wine.exw_price_eur.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€${wine.vintages?.length ? ` - ${Math.max(...wine.vintages)}` : ''}`;
              
              return (
                <div key={wine.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/30">
                  <Checkbox
                    id={wine.id}
                    checked={campaignData.selectedWines.includes(wine.id)}
                    onCheckedChange={(checked) => {
                      const newSelectedWines = checked
                        ? [...campaignData.selectedWines, wine.id]
                        : campaignData.selectedWines.filter(id => id !== wine.id);
                      updateCampaignData({ selectedWines: newSelectedWines });
                    }}
                  />
                  <Label htmlFor={wine.id} className="text-sm flex-1 cursor-pointer">
                    {displayText}
                  </Label>
                  <Badge variant="secondary" className="text-xs">
                    {wine.color}
                  </Badge>
                </div>
              );
            })}
          </div>
        ) : availableCuvees.length > 0 ? (
          <div className="space-y-2 mt-2">
            <p className="text-sm text-muted-foreground mb-2">
              Anciennes cuvées (ajoutez vos cuvées dans votre profil pour une meilleure gestion) :
            </p>
            {availableCuvees.map((cuvee) => (
              <div key={cuvee} className="flex items-center space-x-2">
                <Checkbox
                  id={cuvee}
                  checked={campaignData.cuvees.includes(cuvee)}
                  onCheckedChange={(checked) => {
                    const newCuvees = checked
                      ? [...campaignData.cuvees, cuvee]
                      : campaignData.cuvees.filter(c => c !== cuvee);
                    updateCampaignData({ cuvees: newCuvees });
                  }}
                />
                <Label htmlFor={cuvee} className="text-sm">{cuvee}</Label>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-yellow-50 p-4 rounded-lg mt-4">
            <p className="text-sm text-yellow-800">
              Aucune cuvée disponible. Ajoutez vos cuvées dans votre{' '}
              <Button 
                variant="link" 
                onClick={() => {
                  const newTab = window.open('/profile#vins', '_blank');
                  if (newTab) newTab.focus();
                }} 
                className="p-0 h-auto text-yellow-800 underline"
              >
                Profil
              </Button>
            </p>
          </div>
        )}
      </div>

      <div>
        <Label className="text-base font-semibold">Documents à joindre</Label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <Label>Présentation du domaine (obligatoire)</Label>
            <Select 
              value={campaignData.presentationDocId || ''} 
              onValueChange={(value) => updateCampaignData({ presentationDocId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un document" />
              </SelectTrigger>
              <SelectContent>
                {availableDocuments
                  .filter(doc => doc.category === 'Presentation')
                  .map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>{doc.title}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Liste des prix export (obligatoire)</Label>
            <Select 
              value={campaignData.pricelistDocId || ''} 
              onValueChange={(value) => updateCampaignData({ pricelistDocId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un document" />
              </SelectTrigger>
              <SelectContent>
                {availableDocuments
                  .filter(doc => doc.category === 'PriceList')
                  .map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>{doc.title}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {availableDocuments.length === 0 && (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-800">
              Aucun document disponible. Ajoutez d'abord vos documents dans votre{' '}
              <Button variant="link" onClick={() => navigate('/profile')} className="p-0 h-auto">
                Profil
              </Button>
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6" id="step-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sendAsName">Expéditeur</Label>
          <Input
            id="sendAsName"
            value={campaignData.sendAsName}
            onChange={(e) => updateCampaignData({ sendAsName: e.target.value })}
            placeholder="Nom du domaine"
          />
        </div>

        <div>
          <Label htmlFor="replyTo">Email de réponse</Label>
          <Input
            id="replyTo"
            type="email"
            value={campaignData.replyTo}
            onChange={(e) => updateCampaignData({ replyTo: e.target.value })}
            placeholder="contact@domaine.com"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Objet de l'email</Label>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={generateSubjectVariants}
            disabled={!campaignData.markets.length || !campaignData.sendAsName}
          >
            Générer des suggestions
          </Button>
        </div>
        
        {campaignData.subjectVariants.length > 0 && (
          <RadioGroup 
            value={campaignData.subjectSelected} 
            onValueChange={(value) => updateCampaignData({ subjectSelected: value })}
            className="mt-4"
          >
            {campaignData.subjectVariants.map((subject, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={subject} id={`subject-${index}`} />
                <Label htmlFor={`subject-${index}`} className="text-sm flex-1">
                  {subject}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}
      </div>

      <div>
        <Label htmlFor="messageText">Message (template généré)</Label>
        <Textarea
          id="messageText"
          rows={8}
          value={campaignData.messageText}
          onChange={(e) => updateCampaignData({ messageText: e.target.value })}
          placeholder={`Bonjour {buyer_company},

Nous sommes ${campaignData.sendAsName}, domaine viticole spécialisé en ${getSelectedCuveeNames().join(', ')}.

Nous recherchons des partenaires en ${campaignData.markets.join(', ')} pour développer nos ventes export.

Vous trouverez en pièces jointes :
- Notre présentation
- Notre liste de prix export

N'hésitez pas à nous contacter pour organiser une dégustation.

Cordialement,
${campaignData.sendAsName}`}
        />
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6" id="step-4">
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Récapitulatif de la campagne</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">Ciblage</h4>
            <p className="text-sm text-muted-foreground">
              <strong>Marchés:</strong> {campaignData.markets.join(', ') || 'Aucun'}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Audience:</strong> ≈ {campaignData.audienceEstimate} contacts
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Canaux:</strong> {campaignData.channels.join(', ') || 'Aucun'}
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">Contenu</h4>
            <p className="text-sm text-muted-foreground">
              <strong>Cuvées:</strong> {getSelectedCuveeNames().join(', ') || 'Aucune'}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Objet:</strong> {campaignData.subjectSelected || 'Non défini'}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Expéditeur:</strong> {campaignData.sendAsName || 'Non défini'}
            </p>
          </div>
        </div>
      </div>

      <PreflightBar 
        errors={getPreflightErrors()} 
        onFixClick={(anchor) => {
          const stepMap: { [key: string]: number } = {
            'step-1': 0,
            'step-2': 1,
            'step-3': 2
          };
          const targetStep = stepMap[anchor];
          if (targetStep !== undefined) {
            setCurrentStep(targetStep);
          }
        }} 
      />
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-2xl font-bold">Créer une campagne</h1>
          </div>

          <div className="flex items-center space-x-4">
            {lastSaved && (
              <Badge variant="outline" className="text-green-600">
                Enregistré {lastSaved.toLocaleTimeString()}
              </Badge>
            )}
            {saving && <Badge variant="outline">Enregistrement...</Badge>}
            
            <Button variant="outline" onClick={saveDraft} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              Enregistrer le brouillon
            </Button>
            
            <Button 
              onClick={launchCampaign}
              disabled={loading || getPreflightErrors().length > 0}
            >
              <Rocket className="h-4 w-4 mr-2" />
              {loading ? 'Lancement...' : 'Lancer la campagne'}
            </Button>
          </div>
        </div>

        {/* Stepper */}
        <Stepper
          steps={steps}
          currentStep={currentStep}
          onStepClick={setCurrentStep}
          className="mb-8"
        />

        {/* Main Content */}
        <div className="flex gap-8 flex-1">
          {/* Step Content */}
          <div className="flex-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>{steps[currentStep]}</CardTitle>
              </CardHeader>
              <CardContent className="h-full overflow-y-auto">
                {renderStepContent()}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <CampaignSidebar 
            data={{
              markets: campaignData.markets,
              channels: campaignData.channels,
              segments: campaignData.segments,
              volumeBand: campaignData.volumeBand,
              priceRange: { min: campaignData.priceMin || 0, max: campaignData.priceMax || 0 },
              language: campaignData.language,
              audienceEstimate: campaignData.audienceEstimate,
              cuvees: getSelectedCuveeNames(),
              hasPresentationDoc: !!campaignData.presentationDocId,
              hasPricelistDoc: !!campaignData.pricelistDocId,
              subject: campaignData.subjectSelected,
              scheduleAt: campaignData.scheduleAt
            }}
          />
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Précédent
          </Button>

          <Button
            onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
            disabled={currentStep === steps.length - 1}
          >
            Suivant
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateCampaign;