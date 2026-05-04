import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useCredits } from '@/hooks/useCredits';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, ArrowRight, Save, CheckCircle, AlertCircle, FileText, Globe, Wine, Lightbulb, Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
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
type MarketEntry = { name: string; flag: string };
const MARKETS_BY_CONTINENT: Record<string, MarketEntry[]> = {
  europe: [
    { name: 'Austria', flag: '🇦🇹' }, { name: 'Belgium', flag: '🇧🇪' }, { name: 'Croatia', flag: '🇭🇷' },
    { name: 'Czech Republic', flag: '🇨🇿' }, { name: 'Denmark', flag: '🇩🇰' }, { name: 'Estonia', flag: '🇪🇪' },
    { name: 'Finland', flag: '🇫🇮' }, { name: 'Germany', flag: '🇩🇪' }, { name: 'Greece', flag: '🇬🇷' },
    { name: 'Hungary', flag: '🇭🇺' }, { name: 'Ireland', flag: '🇮🇪' }, { name: 'Italy', flag: '🇮🇹' },
    { name: 'Netherlands', flag: '🇳🇱' }, { name: 'Norway', flag: '🇳🇴' }, { name: 'Poland', flag: '🇵🇱' },
    { name: 'Portugal', flag: '🇵🇹' }, { name: 'Romania', flag: '🇷🇴' }, { name: 'Serbia', flag: '🇷🇸' },
    { name: 'Spain', flag: '🇪🇸' }, { name: 'Sweden', flag: '🇸🇪' }, { name: 'Switzerland', flag: '🇨🇭' },
    { name: 'United Kingdom', flag: '🇬🇧' },
  ],
  northAmerica: [
    { name: 'Canada', flag: '🇨🇦' }, { name: 'Mexico', flag: '🇲🇽' }, { name: 'United States', flag: '🇺🇸' },
  ],
  latinAmerica: [
    { name: 'Argentina', flag: '🇦🇷' }, { name: 'Brazil', flag: '🇧🇷' }, { name: 'Chile', flag: '🇨🇱' },
    { name: 'Colombia', flag: '🇨🇴' }, { name: 'Peru', flag: '🇵🇪' },
  ],
  asia: [
    { name: 'China', flag: '🇨🇳' }, { name: 'Hong Kong', flag: '🇭🇰' }, { name: 'India', flag: '🇮🇳' },
    { name: 'Japan', flag: '🇯🇵' }, { name: 'Singapore', flag: '🇸🇬' }, { name: 'South Korea', flag: '🇰🇷' },
    { name: 'Taiwan', flag: '🇹🇼' }, { name: 'Thailand', flag: '🇹🇭' },
    { name: 'UAE', flag: '🇦🇪' }, { name: 'Vietnam', flag: '🇻🇳' },
  ],
  oceaniaAfrica: [
    { name: 'Australia', flag: '🇦🇺' }, { name: 'Morocco', flag: '🇲🇦' },
    { name: 'Nigeria', flag: '🇳🇬' }, { name: 'South Africa', flag: '🇿🇦' },
  ],
};
const MAX_MARKETS = 15;
const MIN_MARKETS = 5;
const CreateCampaign = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    isFreeUser,
    isAdmin,
    loading: subscriptionLoading
  } = useSubscription();
  const {
    campaignCredits,
    consumeCampaignCredit,
    noCreditsMessage,
    loading: creditsLoading,
  } = useCredits();
  const canLaunchCampaign = isAdmin || campaignCredits > 0;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [wines, setWines] = useState<Wine[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);

  // Form data
  const [campaignName, setCampaignName] = useState('');
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [openToOtherMarkets, setOpenToOtherMarkets] = useState(false);
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
      const {
        data,
        error
      } = await supabase.from('wines').select('*').eq('user_id', user?.id).eq('is_active', true).order('name');
      if (error) throw error;
      setWines(data || []);
    } catch (error) {
      console.error('Error fetching wines:', error);
    }
  };
  const fetchDocuments = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('documents').select('*').eq('user_id', user?.id).order('title');
      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };
  const handleMarketToggle = (market: string) => {
    setSelectedMarkets(prev => {
      if (prev.includes(market)) return prev.filter(m => m !== market);
      if (prev.length >= MAX_MARKETS) {
        toast({ title: t('createCampaign.toasts.maxReached.title'), description: t('createCampaign.toasts.maxReached.description', { max: MAX_MARKETS }), variant: "destructive" });
        return prev;
      }
      return [...prev, market];
    });
  };
  const handleWineToggle = (wineId: string) => {
    setSelectedWines(prev => prev.includes(wineId) ? prev.filter(id => id !== wineId) : [...prev, wineId]);
  };
  const handleTechDocToggle = (docId: string) => {
    setTechDocs(prev => prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]);
  };
  const validateStep1 = () => {
    if (!campaignName.trim()) {
      toast({ title: t('createCampaign.toasts.nameRequired.title'), description: t('createCampaign.toasts.nameRequired.description'), variant: "destructive" });
      return false;
    }
    if (selectedMarkets.length < MIN_MARKETS) {
      toast({ title: t('createCampaign.toasts.marketsInsufficient.title'), description: t('createCampaign.toasts.marketsInsufficient.description', { min: MIN_MARKETS }), variant: "destructive" });
      return false;
    }
    if (selectedWines.length === 0) {
      toast({ title: t('createCampaign.toasts.winesRequired.title'), description: t('createCampaign.toasts.winesRequired.description'), variant: "destructive" });
      return false;
    }
    if (!presentationDoc) {
      toast({
        title: t('createCampaign.toasts.presentationRequired.title'),
        description: t('createCampaign.toasts.presentationRequired.description'),
        variant: "destructive"
      });
      return false;
    }
    if (!pricelistDoc) {
      toast({
        title: t('createCampaign.toasts.pricelistRequired.title'),
        description: t('createCampaign.toasts.pricelistRequired.description'),
        variant: "destructive"
      });
      return false;
    }
    return true;
  };
  const saveDraft = async () => {
    if (!campaignName.trim()) {
      toast({
        title: t('createCampaign.toasts.draftNameRequired.title'),
        description: t('createCampaign.toasts.draftNameRequired.description'),
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
        selected_wines: selectedWines,
        doc_presentation: presentationDoc || null,
        doc_pricelist: pricelistDoc || null,
        doc_techs: techDocs.length > 0 ? techDocs : null,
        techs_link: techsLink || null,
        client_note: clientNote || null
      };
      const {
        data,
        error
      } = await supabase.from('campaigns').insert(campaignData).select().single();
      if (error) throw error;
      toast({
        title: t('createCampaign.toasts.draftSaved.title'),
        description: t('createCampaign.toasts.draftSaved.description')
      });
      navigate('/campaigns');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: t('createCampaign.toasts.draftError.title'),
        description: t('createCampaign.toasts.draftError.description'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const submitForValidation = async () => {
    // Block free users from submitting
    if (isFreeUser) {
      toast({
        title: t('createCampaign.toasts.subscriptionRequired.title'),
        description: t('createCampaign.toasts.subscriptionRequired.description'),
        variant: "destructive"
      });
      return;
    }

    // Check if user has campaigns remaining (admins bypass this check)
    if (!isAdmin && campaignCredits <= 0) {
      toast({
        title: t('createCampaign.toasts.creditExhausted.title'),
        description: noCreditsMessage('campaign'),
        variant: "destructive"
      });
      return;
    }
    if (!validateStep1()) return;
    setLoading(true);
    try {
      const campaignData = {
        name: campaignName,
        user_id: user?.id,
        status: 'pending_validation',
        target_markets: selectedMarkets,
        selected_wines: selectedWines,
        doc_presentation: presentationDoc,
        doc_pricelist: pricelistDoc,
        doc_techs: techDocs.length > 0 ? techDocs : null,
        techs_link: techsLink || null,
        client_note: clientNote || null,
        validation_requested_at: new Date().toISOString()
      };
      const { data: insertedCampaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert(campaignData)
        .select('id')
        .single();
      
      if (campaignError) throw campaignError;

      // Consume one campaign credit via RPC (admins bypass)
      if (!isAdmin) {
        const { ok } = await consumeCampaignCredit();
        if (!ok) {
          toast({
            title: t('createCampaign.toasts.creditExhaustedShort.title'),
            description: noCreditsMessage('campaign'),
            variant: 'destructive',
          });
        }
      }

      // Send notification (silent - don't block on failure)
      try {
        await supabase.functions.invoke('notify-campaign-submission', {
          body: {
            campaignName,
            userEmail: user?.email || 'Unknown',
            markets: selectedMarkets,
            campaignId: insertedCampaign?.id || '',
          },
        });
        console.log('Notification sent successfully');
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
      }

      toast({
        title: t('createCampaign.toasts.submitted.title'),
        description: t('createCampaign.toasts.submitted.description')
      });
      navigate('/campaigns');
    } catch (error: any) {
      console.error('Error submitting campaign:', error);
      toast({
        title: t('createCampaign.toasts.submitError.title'),
        description: error?.message || t('createCampaign.toasts.submitError.description'),
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
  return <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/campaigns')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('createCampaign.back')}
            </Button>
            <h1 className="text-2xl font-bold">{t('createCampaign.title')}</h1>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={saveDraft} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {t('createCampaign.saveDraft')}
            </Button>
            {step === 2 && <Button onClick={submitForValidation} disabled={loading}>
                <CheckCircle className="h-4 w-4 mr-2" />
                {t('createCampaign.submit')}
              </Button>}
          </div>
        </div>

        {/* Step 1: Markets & Wines */}
        {step === 1 && <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {t('createCampaign.step1.title')}
                </CardTitle>
                <CardDescription>{t('createCampaign.step1.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Campaign Name */}
                <div>
                  <Label htmlFor="campaignName">{t('createCampaign.step1.campaignName')}</Label>
                  <Input id="campaignName" value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder={t('createCampaign.step1.campaignNamePlaceholder')} className="mt-1" />
                </div>

                {/* Markets to target */}
                <div>
                  <Label>{t('createCampaign.step1.marketsLabel')} <span className="text-muted-foreground font-normal">{t('createCampaign.step1.marketsCount', { count: selectedMarkets.length, max: MAX_MARKETS, min: MIN_MARKETS })}</span></Label>
                  <div className="space-y-4 mt-3">
                    {Object.entries(MARKETS_BY_CONTINENT).map(([continentKey, markets]) => (
                      <div key={continentKey}>
                        <p className="text-sm font-semibold text-muted-foreground mb-2">{t(`createCampaign.continents.${continentKey}`)}</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {markets.map(market => (
                            <div key={market} className="flex items-center space-x-2">
                              <Checkbox id={market} checked={selectedMarkets.includes(market)} onCheckedChange={() => handleMarketToggle(market)} disabled={!selectedMarkets.includes(market) && selectedMarkets.length >= MAX_MARKETS} />
                              <Label htmlFor={market} className="text-sm">{market}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Info block */}
                <Alert className="bg-muted/50 border-primary/20">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm text-muted-foreground">
                    {t('createCampaign.step1.infoBlock', { min: MIN_MARKETS, max: MAX_MARKETS })}
                  </AlertDescription>
                </Alert>

                {/* Wines */}
                <div>
                  <Label>{t('createCampaign.step1.winesLabel')}</Label>
                  {wines.length === 0 ? <Alert className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {t('createCampaign.step1.noWines')}
                      </AlertDescription>
                    </Alert> : <div className="space-y-2 mt-2">
                      {wines.map(wine => <div key={wine.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                          <Checkbox id={wine.id} checked={selectedWines.includes(wine.id)} onCheckedChange={() => handleWineToggle(wine.id)} />
                          <Wine className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <Label htmlFor={wine.id} className="font-medium">
                              {wine.name}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {t('createCampaign.step1.wineDetails', { color: wine.color, appellation: wine.appellation, price: wine.exw_price_eur })}
                            </p>
                          </div>
                        </div>)}
                    </div>}
                </div>

                {/* Documents */}
                <div className="space-y-4">
                  <h3 className="font-medium">{t('createCampaign.step1.documentsRequired')}</h3>
                  
                  {/* Presentation */}
                  <div>
                    <Label htmlFor="presentation">{t('createCampaign.step1.presentationLabel')}</Label>
                    <Select value={presentationDoc} onValueChange={setPresentationDoc}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t('createCampaign.step1.presentationPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {documents.filter(doc => doc.category === 'presentation').map(doc => <SelectItem key={doc.id} value={doc.id}>
                            {doc.title}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Pricelist */}
                  <div>
                    <Label htmlFor="pricelist">{t('createCampaign.step1.pricelistLabel')}</Label>
                    <Select value={pricelistDoc} onValueChange={setPricelistDoc}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t('createCampaign.step1.pricelistPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {documents.filter(doc => doc.category === 'price_list').map(doc => <SelectItem key={doc.id} value={doc.id}>
                            {doc.title}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tech docs */}
                  <div>
                    <Label>{t('createCampaign.step1.techDocsLabel')}</Label>
                    <Select value={techDocs.length > 0 ? techDocs[0] : ''} onValueChange={value => {
                  if (value && !techDocs.includes(value)) {
                    setTechDocs(prev => [...prev, value]);
                  }
                }}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t('createCampaign.step1.techDocsPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {documents.filter(doc => doc.category === 'tech_sheet').map(doc => <SelectItem key={doc.id} value={doc.id}>
                            {doc.title}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                    {techDocs.length > 0 && <div className="flex flex-wrap gap-2 mt-2">
                        {techDocs.map(docId => {
                    const doc = documents.find(d => d.id === docId);
                    return doc ? <div key={docId} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-sm">
                              <FileText className="h-3 w-3" />
                              {doc.title}
                              <button type="button" onClick={() => setTechDocs(prev => prev.filter(id => id !== docId))} className="ml-1 text-muted-foreground hover:text-foreground">
                                ×
                              </button>
                            </div> : null;
                  })}
                      </div>}
                  </div>

                  {/* Client note */}
                  <div>
                    <Label htmlFor="clientNote">{t('createCampaign.step1.clientNoteLabel')}</Label>
                    <Textarea id="clientNote" value={clientNote} onChange={e => setClientNote(e.target.value)} placeholder={t('createCampaign.step1.clientNotePlaceholder')} className="mt-1" rows={3} />
                  </div>
                </div>

                <Button onClick={() => {
              if (validateStep1()) {
                setStep(2);
              }
            }} className="w-full">
                  {t('createCampaign.step1.continueBtn')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>}

        {/* Step 2: Recap & Submission */}
        {step === 2 && <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('createCampaign.step2.title')}</CardTitle>
                <CardDescription>
                  {t('createCampaign.step2.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Recap */}
                <div className="space-y-4">
                  <div>
                    <Label className="font-medium">{t('createCampaign.step2.campaignNameLabel')}</Label>
                    <p className="text-sm text-muted-foreground mt-1">{campaignName}</p>
                  </div>

                  <div>
                    <Label className="font-medium">{t('createCampaign.step2.marketsLabel', { count: selectedMarkets.length })}</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedMarkets.join(', ')}
                    </p>
                  </div>

                  <div>
                    <Label className="font-medium">{t('createCampaign.step2.winesLabel', { count: selectedWines.length })}</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getSelectedWineNames().join(', ')}
                    </p>
                  </div>

                  <div>
                    <Label className="font-medium">{t('createCampaign.step2.documentsLabel')}</Label>
                    <div className="text-sm text-muted-foreground mt-1 space-y-1">
                      <p>{t('createCampaign.step2.presentationItem', { title: getDocumentTitle(presentationDoc) })}</p>
                      <p>{t('createCampaign.step2.pricelistItem', { title: getDocumentTitle(pricelistDoc) })}</p>
                      {techDocs.length > 0 && <p>{t('createCampaign.step2.techDocsItem', { titles: techDocs.map(id => getDocumentTitle(id)).join(', ') })}</p>}
                      {techsLink && <p>{t('createCampaign.step2.techLinkItem', { link: techsLink })}</p>}
                    </div>
                  </div>

                  {clientNote && <div>
                      <Label className="font-medium">{t('createCampaign.step2.clientNoteLabel')}</Label>
                      <p className="text-sm text-muted-foreground mt-1">{clientNote}</p>
                    </div>}
                </div>

                {/* Warning */}
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{t('createCampaign.step2.warningTitle')}</strong><br />
                    {t('createCampaign.step2.warningBody')}
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('createCampaign.step2.backToStep1')}
                  </Button>
                  <Button onClick={submitForValidation} disabled={loading} className="flex-1">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t('createCampaign.submit')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>}
      </div>
    </div>;
};
export default CreateCampaign;