import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, ArrowRight, Save, CheckCircle, AlertCircle, FileText, Globe, Wine } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Wine {
  id: string;
  name: string;
  color: string;
  appellation: string;
  exw_price_eur: number;
}

interface Document {
  id: string;
  title: string;
  category: string;
  file_name: string;
}

const AVAILABLE_MARKETS = [
  'France', 'Allemagne', 'Belgique', 'Pays-Bas', 'Royaume-Uni', 'Suisse',
  'États-Unis', 'Canada', 'Japon', 'Chine', 'Hong Kong', 'Singapour',
  'Australie', 'Nouvelle-Zélande', 'Brésil', 'Mexique', 'Corée du Sud',
  'Danemark', 'Suède', 'Norvège'
];

const CreateCampaign = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [wines, setWines] = useState<Wine[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  
  // Form data
  const [campaignName, setCampaignName] = useState('');
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [selectedWines, setSelectedWines] = useState<string[]>([]);
  const [presentationDoc, setPresentationDoc] = useState('');
  const [pricelistDoc, setPricelistDoc] = useState('');
  const [techDocs, setTechDocs] = useState<string[]>([]);
  const [techsLink, setTechsLink] = useState('');
  const [clientNote, setClientNote] = useState('');

  useEffect(() => {
    if (user) {
      fetchWines();
      fetchDocuments();
    }
  }, [user]);

  const fetchWines = async () => {
    try {
      const { data, error } = await supabase
        .from('wines')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setWines(data || []);
    } catch (error) {
      console.error('Error fetching wines:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user?.id)
        .order('title');

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleMarketToggle = (market: string) => {
    setSelectedMarkets(prev => 
      prev.includes(market) 
        ? prev.filter(m => m !== market)
        : [...prev, market]
    );
  };

  const handleWineToggle = (wineId: string) => {
    setSelectedWines(prev => 
      prev.includes(wineId) 
        ? prev.filter(id => id !== wineId)
        : [...prev, wineId]
    );
  };

  const handleTechDocToggle = (docId: string) => {
    setTechDocs(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const validateStep1 = () => {
    if (!campaignName.trim()) {
      toast({
        title: "Nom de campagne requis",
        description: "Veuillez saisir un nom pour votre campagne",
        variant: "destructive"
      });
      return false;
    }
    if (selectedMarkets.length === 0) {
      toast({
        title: "Marchés requis",
        description: "Veuillez sélectionner au moins un marché prioritaire",
        variant: "destructive"
      });
      return false;
    }
    if (selectedWines.length === 0) {
      toast({
        title: "Vins requis",
        description: "Veuillez sélectionner au moins une cuvée",
        variant: "destructive"
      });
      return false;
    }
    if (!presentationDoc) {
      toast({
        title: "Présentation du domaine requise",
        description: "Veuillez sélectionner une présentation du domaine",
        variant: "destructive"
      });
      return false;
    }
    if (!pricelistDoc) {
      toast({
        title: "Liste des prix requise",
        description: "Veuillez sélectionner une liste des prix export",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const saveDraft = async () => {
    if (!campaignName.trim()) {
      toast({
        title: "Nom requis",
        description: "Veuillez saisir un nom pour sauvegarder",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const campaignData = {
        name: campaignName,
        user_id: user?.id,
        status: 'draft',
        target_markets: selectedMarkets,
        markets: selectedMarkets,
        selected_wines: selectedWines,
        doc_presentation: presentationDoc || null,
        doc_pricelist: pricelistDoc || null,
        doc_techs: techDocs.length > 0 ? techDocs : null,
        techs_link: techsLink || null,
        client_note: clientNote || null,
      };

      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaignData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Brouillon sauvegardé",
        description: "Votre campagne a été sauvegardée en brouillon",
      });

      navigate(`/campaigns/${data.id}`);
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le brouillon",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const submitForValidation = async () => {
    if (!validateStep1()) return;

    setLoading(true);
    try {
      const campaignData = {
        name: campaignName,
        user_id: user?.id,
        status: 'pending_validation',
        target_markets: selectedMarkets,
        markets: selectedMarkets,
        selected_wines: selectedWines,
        doc_presentation: presentationDoc,
        doc_pricelist: pricelistDoc,
        doc_techs: techDocs.length > 0 ? techDocs : null,
        techs_link: techsLink || null,
        client_note: clientNote || null,
        validation_requested_at: new Date().toISOString(),
      };

      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert(campaignData)
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Create admin task
      const { error: taskError } = await supabase
        .from('admin_tasks')
        .insert({
          type: 'campaign_validation',
          campaign_id: campaign.id,
          status: 'open'
        });

      if (taskError) throw taskError;

      toast({
        title: "Campagne soumise",
        description: "En attente de validation (≤72h)",
      });

      navigate(`/campaigns/${campaign.id}`);
    } catch (error) {
      console.error('Error submitting campaign:', error);
      toast({
        title: "Erreur",
        description: "Impossible de soumettre la campagne",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getSelectedWineNames = () => {
    return wines.filter(wine => selectedWines.includes(wine.id)).map(wine => wine.name);
  };

  const getDocumentTitle = (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    return doc ? doc.title : '';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/campaigns')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-2xl font-bold">Créer une campagne</h1>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={saveDraft}
              disabled={loading}
            >
              <Save className="h-4 w-4 mr-2" />
              Enregistrer brouillon
            </Button>
            {step === 2 && (
              <Button
                onClick={submitForValidation}
                disabled={loading}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Soumettre pour validation
              </Button>
            )}
          </div>
        </div>

        {/* Step 1: Markets & Wines */}
        {step === 1 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Étape 1 — Marchés & Vins
                </CardTitle>
                <CardDescription>
                  Définissez vos marchés prioritaires et sélectionnez vos cuvées
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Campaign Name */}
                <div>
                  <Label htmlFor="campaignName">Nom de la campagne *</Label>
                  <Input
                    id="campaignName"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Ex: Lancement Millésime 2023"
                    className="mt-1"
                  />
                </div>

                {/* Markets */}
                <div>
                  <Label>Marchés prioritaires * (sélection multiple)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                    {AVAILABLE_MARKETS.map((market) => (
                      <div key={market} className="flex items-center space-x-2">
                        <Checkbox
                          id={market}
                          checked={selectedMarkets.includes(market)}
                          onCheckedChange={() => handleMarketToggle(market)}
                        />
                        <Label htmlFor={market} className="text-sm">
                          {market}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Wines */}
                <div>
                  <Label>Sélection des cuvées *</Label>
                  {wines.length === 0 ? (
                    <Alert className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Aucun vin actif trouvé. Veuillez d'abord ajouter des vins dans votre profil.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-2 mt-2">
                      {wines.map((wine) => (
                        <div key={wine.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                          <Checkbox
                            id={wine.id}
                            checked={selectedWines.includes(wine.id)}
                            onCheckedChange={() => handleWineToggle(wine.id)}
                          />
                          <Wine className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <Label htmlFor={wine.id} className="font-medium">
                              {wine.name}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {wine.color} - {wine.appellation} - {wine.exw_price_eur}€ EXW
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Documents */}
                <div className="space-y-4">
                  <h3 className="font-medium">Documents requis</h3>
                  
                  {/* Presentation */}
                  <div>
                    <Label htmlFor="presentation">Présentation du domaine *</Label>
                    <Select value={presentationDoc} onValueChange={setPresentationDoc}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Sélectionner une présentation" />
                      </SelectTrigger>
                      <SelectContent>
                        {documents.filter(doc => doc.category === 'presentation').map((doc) => (
                          <SelectItem key={doc.id} value={doc.id}>
                            {doc.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Pricelist */}
                  <div>
                    <Label htmlFor="pricelist">Liste des prix export *</Label>
                    <Select value={pricelistDoc} onValueChange={setPricelistDoc}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Sélectionner une liste de prix" />
                      </SelectTrigger>
                      <SelectContent>
                        {documents.filter(doc => doc.category === 'pricelist').map((doc) => (
                          <SelectItem key={doc.id} value={doc.id}>
                            {doc.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tech docs */}
                  <div>
                    <Label>Fiches techniques (facultatif)</Label>
                    <div className="space-y-2 mt-2">
                      {documents.filter(doc => doc.category === 'tech').map((doc) => (
                        <div key={doc.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={doc.id}
                            checked={techDocs.includes(doc.id)}
                            onCheckedChange={() => handleTechDocToggle(doc.id)}
                          />
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <Label htmlFor={doc.id} className="text-sm">
                            {doc.title}
                          </Label>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-3">
                      <Label htmlFor="techsLink">Ou lien sécurisé vers fiches techniques</Label>
                      <Input
                        id="techsLink"
                        value={techsLink}
                        onChange={(e) => setTechsLink(e.target.value)}
                        placeholder="https://..."
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Client note */}
                  <div>
                    <Label htmlFor="clientNote">Note à l'équipe (optionnel)</Label>
                    <Textarea
                      id="clientNote"
                      value={clientNote}
                      onChange={(e) => setClientNote(e.target.value)}
                      placeholder="Objectifs, précisions, demandes particulières..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </div>

                <Button
                  onClick={() => {
                    if (validateStep1()) {
                      setStep(2);
                    }
                  }}
                  className="w-full"
                >
                  Continuer vers le récapitulatif
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Recap & Submission */}
        {step === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Étape 2 — Récapitulatif & Soumission</CardTitle>
                <CardDescription>
                  Vérifiez les informations avant soumission
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Recap */}
                <div className="space-y-4">
                  <div>
                    <Label className="font-medium">Nom de la campagne</Label>
                    <p className="text-sm text-muted-foreground mt-1">{campaignName}</p>
                  </div>

                  <div>
                    <Label className="font-medium">Marchés prioritaires ({selectedMarkets.length})</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedMarkets.join(', ')}
                    </p>
                  </div>

                  <div>
                    <Label className="font-medium">Cuvées sélectionnées ({selectedWines.length})</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getSelectedWineNames().join(', ')}
                    </p>
                  </div>

                  <div>
                    <Label className="font-medium">Documents</Label>
                    <div className="text-sm text-muted-foreground mt-1 space-y-1">
                      <p>• Présentation: {getDocumentTitle(presentationDoc)}</p>
                      <p>• Liste des prix: {getDocumentTitle(pricelistDoc)}</p>
                      {techDocs.length > 0 && (
                        <p>• Fiches techniques: {techDocs.map(id => getDocumentTitle(id)).join(', ')}</p>
                      )}
                      {techsLink && (
                        <p>• Lien fiches techniques: {techsLink}</p>
                      )}
                    </div>
                  </div>

                  {clientNote && (
                    <div>
                      <Label className="font-medium">Note à l'équipe</Label>
                      <p className="text-sm text-muted-foreground mt-1">{clientNote}</p>
                    </div>
                  )}
                </div>

                {/* Warning */}
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>À la soumission, votre campagne passe en attente de validation.</strong><br />
                    Notre équipe la prépare sous 72h. Vous serez notifié(e) à la validation. 
                    Sous 7 jours, les importateurs intéressés apparaîtront dans votre espace Prospects.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour à l'étape 1
                  </Button>
                  <Button
                    onClick={submitForValidation}
                    disabled={loading}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Soumettre pour validation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateCampaign;