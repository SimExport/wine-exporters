import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Mail, Phone, MapPin, Plus, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays, format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { SEO } from '@/components/SEO';
import { getOrCreateManualCampaign } from '@/lib/manual-campaign';

const COUNTRY_FLAGS: Record<string, string> = {
  'suede': '🇸🇪', 'suède': '🇸🇪', 'sweden': '🇸🇪',
  'france': '🇫🇷',
  'belgique': '🇧🇪', 'belgium': '🇧🇪',
  'allemagne': '🇩🇪', 'germany': '🇩🇪',
  'royaume-uni': '🇬🇧', 'royaume uni': '🇬🇧', 'united kingdom': '🇬🇧', 'uk': '🇬🇧', 'angleterre': '🇬🇧',
  'etats-unis': '🇺🇸', 'états-unis': '🇺🇸', 'usa': '🇺🇸', 'united states': '🇺🇸', 'us': '🇺🇸',
  'canada': '🇨🇦',
  'suisse': '🇨🇭', 'switzerland': '🇨🇭',
  'pays-bas': '🇳🇱', 'netherlands': '🇳🇱', 'hollande': '🇳🇱',
  'italie': '🇮🇹', 'italy': '🇮🇹',
  'espagne': '🇪🇸', 'spain': '🇪🇸',
  'norvège': '🇳🇴', 'norvege': '🇳🇴', 'norway': '🇳🇴',
  'finlande': '🇫🇮', 'finland': '🇫🇮',
  'danemark': '🇩🇰', 'denmark': '🇩🇰',
  'japon': '🇯🇵', 'japan': '🇯🇵',
  'chine': '🇨🇳', 'china': '🇨🇳',
  'irlande': '🇮🇪', 'ireland': '🇮🇪',
  'autriche': '🇦🇹', 'austria': '🇦🇹',
  'pologne': '🇵🇱', 'poland': '🇵🇱',
  'portugal': '🇵🇹',
  'luxembourg': '🇱🇺',
  'australie': '🇦🇺', 'australia': '🇦🇺',
  'bresil': '🇧🇷', 'brésil': '🇧🇷', 'brazil': '🇧🇷',
  'mexique': '🇲🇽', 'mexico': '🇲🇽',
  'coree du sud': '🇰🇷', 'corée du sud': '🇰🇷', 'south korea': '🇰🇷', 'korea': '🇰🇷',
  'singapour': '🇸🇬', 'singapore': '🇸🇬',
  'hong kong': '🇭🇰',
};

function countryFlag(input: string | null | undefined): string {
  if (!input) return '🌍';
  const s = input.toLowerCase();
  if (COUNTRY_FLAGS[s.trim()]) return COUNTRY_FLAGS[s.trim()];
  for (const key of Object.keys(COUNTRY_FLAGS)) {
    if (s.includes(key)) return COUNTRY_FLAGS[key];
  }
  return '🌍';
}

function splitMulti(s: string | null | undefined): string[] {
  if (!s) return [];
  return s.split(/[,/]| - | – /).map(x => x.trim()).filter(Boolean);
}

interface ImporterRequest {
  id: string;
  full_name: string;
  company_name: string;
  country: string | null;
  email: string;
  phone: string | null;
  wine_styles: string | null;
  origins: string | null;
  volume: string | null;
  requirements: string | null;
  submitted_at: string | null;
}

interface TenderRequest {
  id: string;
  reference: string;
  market: string;
  category: string | null;
  designation_origin: string | null;
  price: string | null;
  available_volume: string | null;
  vintage: string | null;
  deadline_answer: string | null;
  deadline_sample: string | null;
  style_profile: string | null;
  requirements: string | null;
  agent: {
    name: string;
    company: string;
    email: string;
    phone: string | null;
    address: string | null;
  } | null;
}

export default function Opportunities() {
  const { t: tr, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [importers, setImporters] = useState<ImporterRequest[]>([]);
  const [tenders, setTenders] = useState<TenderRequest[]>([]);
  const [addedRefs, setAddedRefs] = useState<Set<string>>(new Set());
  const [contactDialog, setContactDialog] = useState<
    | { kind: 'importer'; data: ImporterRequest }
    | { kind: 'tender'; data: TenderRequest }
    | null
  >(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [imp, ten, leads] = await Promise.all([
        supabase
          .from('importer_requests')
          .select('*')
          .eq('status', 'published')
          .order('submitted_at', { ascending: false, nullsFirst: false }),
        supabase
          .from('tender_requests')
          .select('*, agent:tender_agents(name, company, email, phone, address)')
          .eq('status', 'published')
          .order('deadline_answer', { ascending: true, nullsFirst: false }),
        supabase
          .from('leads')
          .select('source_ref')
          .eq('created_by', user.id)
          .not('source_ref', 'is', null),
      ]);
      setImporters((imp.data ?? []) as any);
      setTenders((ten.data ?? []) as any);
      setAddedRefs(new Set((leads.data ?? []).map((l: any) => l.source_ref)));
    })();
  }, [user]);

  const addImporterToCrm = async (r: ImporterRequest) => {
    if (!user) return;
    try {
      const campaignId = await getOrCreateManualCampaign(user.id);
      const nameParts = r.full_name.split(' ');
      const { error } = await supabase.from('leads').insert({
        campaign_id: campaignId,
        buyer_id: r.email || `importer-${r.id}`,
        market: r.country || 'Direct request',
        first_name: nameParts.slice(0, -1).join(' ') || r.full_name,
        last_name: nameParts.length > 1 ? nameParts.slice(-1)[0] : null,
        company_name: r.company_name,
        email: r.email,
        phone: r.phone,
        country: r.country,
        prospect_status: 'new' as any,
        last_activity_at: new Date().toISOString(),
        created_by: user.id,
        source: 'opportunity_direct',
        source_ref: r.id,
        message_snippet: [r.wine_styles, r.origins, r.volume, r.requirements].filter(Boolean).join(' · '),
      } as any);
      if (error) throw error;
      setAddedRefs(prev => new Set(prev).add(r.id));
      toast({ title: t('opportunitiesPage.toast.added'), description: r.company_name });
    } catch (e: any) {
      toast({ title: t('opportunitiesPage.toast.error'), description: e.message, variant: 'destructive' });
    }
  };

  const addTenderToCrm = async (t: TenderRequest) => {
    if (!user || !t.agent) return;
    try {
      const campaignId = await getOrCreateManualCampaign(user.id);
      const { error } = await supabase.from('leads').insert({
        campaign_id: campaignId,
        buyer_id: t.agent.email || `tender-${t.id}`,
        market: t.market,
        first_name: t.agent.name.split(' ').slice(0, -1).join(' ') || t.agent.name,
        last_name: t.agent.name.split(' ').slice(-1)[0] || null,
        company_name: t.agent.company,
        email: t.agent.email,
        phone: t.agent.phone,
        address_line1: t.agent.address,
        prospect_status: 'new' as any,
        last_activity_at: new Date().toISOString(),
        created_by: user.id,
        source: 'opportunity_tender',
        source_ref: t.id,
        owner_notes: `Appel d'offres ${t.reference} — ${t.designation_origin ?? ''}\nPrix cible : ${t.price ?? '—'}\nVolume : ${t.available_volume ?? '—'}\nDeadline réponse : ${t.deadline_answer ?? '—'}\nDeadline échantillon : ${t.deadline_sample ?? '—'}\n\nProfil : ${t.style_profile ?? '—'}\nExigences : ${t.requirements ?? '—'}`,
      } as any);
      if (error) throw error;
      setAddedRefs(prev => new Set(prev).add(t.id));
      toast({ title: tt('opportunitiesPage.toast.added'), description: `${t.reference} — ${t.agent.company}` });
    } catch (e: any) {
      toast({ title: tt('opportunitiesPage.toast.error'), description: e.message, variant: 'destructive' });
    }
  };

  const deadlineBadge = (date: string | null) => {
    if (!date) return null;
    const days = differenceInDays(new Date(date), new Date());
    if (days < 0) return <Badge variant="outline">{t('opportunitiesPage.states.closed')}</Badge>;
    const lbl = t('opportunitiesPage.states.daysLeft', { count: days });
    if (days < 30) return <Badge variant="destructive">{lbl}</Badge>;
    if (days < 60) return <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-transparent">{lbl}</Badge>;
    return <Badge variant="secondary">{lbl}</Badge>;
  };

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <SEO
        title="Importateurs en recherche active — WineExporters"
        description="Des acheteurs ont laissé leurs coordonnées pour trouver leur prochain fournisseur, et les appels d'offres officiels en cours."
        path="/opportunites"
      />
      <header>
        <h1 className="text-3xl font-semibold" style={{ fontFamily: 'Georgia, serif' }}>
          Importateurs en recherche active
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Des acheteurs ont laissé leurs coordonnées pour trouver leur prochain fournisseur. Découvrez aussi les appels d'offres officiels en cours sur les marchés monopoles.
        </p>
      </header>

      <Tabs defaultValue="direct" className="w-full">
        <TabsList>
          <TabsTrigger value="direct">Demandes directes ({importers.length})</TabsTrigger>
          <TabsTrigger value="tender">Appels d'offres ({tenders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="direct" className="mt-6">
          {importers.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune demande directe pour le moment.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {importers.map(r => {
                const added = addedRefs.has(r.id);
                const req = r.requirements?.trim();
                return (
                  <Card key={r.id} className="flex flex-col">
                    <CardContent className="pt-6 px-5 pb-5 flex-1 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 font-semibold">
                          <span className="text-2xl leading-none">{countryFlag(r.country)}</span>
                          <span>{r.country ?? '—'}</span>
                        </div>
                        {r.submitted_at && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(r.submitted_at), 'd MMM yyyy', { locale: fr })}
                          </span>
                        )}
                      </div>
                      {r.company_name && (
                        <div className="text-sm font-medium">{r.company_name}</div>
                      )}
                      {(r.wine_styles || r.volume || r.origins) && (
                        <div className="flex flex-wrap gap-2">
                          {r.wine_styles && (
                            <span className="bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs">
                              {r.wine_styles}
                            </span>
                          )}
                          {r.volume && (
                            <span className="bg-gold text-gold-foreground rounded-full px-3 py-1 text-xs font-medium">
                              {r.volume}
                            </span>
                          )}
                          {r.origins && (
                            <span className="border border-primary/30 text-primary rounded-full px-3 py-1 text-xs">
                              {r.origins}
                            </span>
                          )}
                        </div>
                      )}
                      {req && (
                        <p className="text-xs text-muted-foreground/80 leading-relaxed">
                          {req}
                        </p>
                      )}
                    </CardContent>
                    <div className="px-5 pb-5 flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setContactDialog({ kind: 'importer', data: r })}>
                        Répondre
                      </Button>
                      <Button size="sm" className="flex-1" disabled={added} onClick={() => addImporterToCrm(r)}>
                        {added ? <><CheckCircle2 className="h-4 w-4 mr-1" />Ajouté</> : <><Plus className="h-4 w-4 mr-1" />CRM</>}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tender" className="mt-6">
          {tenders.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun appel d'offres pour le moment.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tenders.map(t => {
                const added = addedRefs.has(t.id);
                const styleProfile = t.style_profile?.trim();
                const tReq = t.requirements?.trim();
                return (
                  <Card key={t.id} className="flex flex-col border-primary/20">
                    <CardContent className="pt-6 px-5 pb-5 flex-1 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 font-semibold">
                          <span className="text-2xl leading-none">{countryFlag(t.market)}</span>
                          <div>
                            <div>{t.market}</div>
                            <div className="text-xs text-muted-foreground font-mono font-normal">{t.reference}</div>
                          </div>
                        </div>
                        {deadlineBadge(t.deadline_answer)}
                      </div>
                      {t.designation_origin && (
                        <div className="text-base font-medium">{t.designation_origin}</div>
                      )}
                      {(t.category || t.available_volume || t.vintage || t.price) && (
                        <div className="flex flex-wrap gap-2">
                          {t.category && (
                            <span className="bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs">
                              {t.category}
                            </span>
                          )}
                          {t.available_volume && (
                            <span className="bg-gold text-gold-foreground rounded-full px-3 py-1 text-xs font-medium">
                              {t.available_volume}
                            </span>
                          )}
                          {t.price && (
                            <span className="border border-gold/60 text-gold-foreground/80 bg-gold/10 rounded-full px-3 py-1 text-xs">
                              {t.price}
                            </span>
                          )}
                          {t.vintage && (
                            <span className="border border-primary/30 text-primary rounded-full px-3 py-1 text-xs">
                              {t.vintage}
                            </span>
                          )}
                        </div>
                      )}
                      {t.deadline_sample && (
                        <div className="text-xs text-muted-foreground">
                          Échantillon attendu : {t.deadline_sample}
                        </div>
                      )}
                      {styleProfile && (
                        <p className="text-xs text-muted-foreground/80 leading-relaxed">{styleProfile}</p>
                      )}
                      {tReq && (
                        <p className="text-xs text-muted-foreground/80 leading-relaxed">{tReq}</p>
                      )}
                    </CardContent>
                    <div className="px-5 pb-5 flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setContactDialog({ kind: 'tender', data: t })}>
                        Répondre
                      </Button>
                      <Button size="sm" className="flex-1" disabled={added || !t.agent} onClick={() => addTenderToCrm(t)}>
                        {added ? <><CheckCircle2 className="h-4 w-4 mr-1" />Ajouté</> : <><Plus className="h-4 w-4 mr-1" />CRM</>}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-8 rounded-md bg-muted/40 border border-border/50 px-4 py-3 text-center text-xs text-muted-foreground">
        WineExporters ne prend aucune commission sur les demandes directes et appels d'offres. Les coordonnées des importateurs et agents vous sont communiquées directement, à vous de mener la relation.
      </div>

      <Dialog open={!!contactDialog} onOpenChange={(o) => !o && setContactDialog(null)}>
        <DialogContent>
          {contactDialog?.kind === 'importer' && (
            <>
              <DialogHeader>
                <DialogTitle>{contactDialog.data.company_name}</DialogTitle>
                <DialogDescription>
                  Contactez directement {contactDialog.data.full_name}. Vous pouvez aussi ajouter cette demande à votre CRM pour la suivre.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /><a className="underline" href={`mailto:${contactDialog.data.email}`}>{contactDialog.data.email}</a></div>
                {contactDialog.data.phone && (
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /><a className="underline" href={`tel:${contactDialog.data.phone}`}>{contactDialog.data.phone}</a></div>
                )}
              </div>
            </>
          )}
          {contactDialog?.kind === 'tender' && contactDialog.data.agent && (
            <>
              <DialogHeader>
                <DialogTitle>Agent à contacter</DialogTitle>
                <DialogDescription>
                  Adressez votre offre à l'agent en charge de cet appel d'offres ({contactDialog.data.reference}).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div className="font-semibold">{contactDialog.data.agent.name}</div>
                <div className="text-muted-foreground">{contactDialog.data.agent.company}</div>
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /><a className="underline" href={`mailto:${contactDialog.data.agent.email}`}>{contactDialog.data.agent.email}</a></div>
                {contactDialog.data.agent.phone && (
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /><a className="underline" href={`tel:${contactDialog.data.agent.phone}`}>{contactDialog.data.agent.phone}</a></div>
                )}
                {contactDialog.data.agent.address && (
                  <div className="flex items-start gap-2"><MapPin className="h-4 w-4 text-primary mt-0.5" /><span>{contactDialog.data.agent.address}</span></div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}