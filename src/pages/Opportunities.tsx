import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Mail, Phone, MapPin, Calendar, Wine, Globe, Building2, Package, Plus, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SEO } from '@/components/SEO';
import { getOrCreateManualCampaign } from '@/lib/manual-campaign';

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
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
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
      toast({ title: 'Ajouté au CRM', description: r.company_name });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
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
      toast({ title: 'Ajouté au CRM', description: `${t.reference} — ${t.agent.company}` });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  const deadlineBadge = (date: string | null) => {
    if (!date) return null;
    const days = differenceInDays(new Date(date), new Date());
    if (days < 0) return <Badge variant="outline">Clôturé</Badge>;
    if (days < 30) return <Badge variant="destructive">{days}j restants</Badge>;
    if (days < 60) return <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-transparent">{days}j restants</Badge>;
    return <Badge variant="secondary">{days}j restants</Badge>;
  };

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <SEO
        title="Opportunités d'export — WineExporters"
        description="Importateurs qui recherchent activement vos vins et appels d'offres en cours."
        path="/opportunites"
      />
      <header>
        <h1 className="text-3xl font-semibold" style={{ fontFamily: 'Georgia, serif' }}>Opportunités d'export</h1>
        <p className="text-muted-foreground mt-1">
          Importateurs qui recherchent activement des vins, et appels d'offres officiels en cours.
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
                return (
                  <Card key={r.id} className="flex flex-col">
                    <CardContent className="pt-6 flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Globe className="h-4 w-4 text-primary" />
                          {r.country ?? '—'}
                        </div>
                        {r.submitted_at && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(r.submitted_at), 'd MMM yyyy', { locale: fr })}
                          </span>
                        )}
                      </div>
                      {r.wine_styles && (
                        <div className="flex items-start gap-2 text-sm">
                          <Wine className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <span>{r.wine_styles}</span>
                        </div>
                      )}
                      {r.origins && (
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <span>{r.origins}</span>
                        </div>
                      )}
                      {r.volume && (
                        <div className="flex items-start gap-2 text-sm">
                          <Package className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <span>{r.volume}</span>
                        </div>
                      )}
                      {r.requirements && (
                        <p className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-2 italic">
                          {r.requirements}
                        </p>
                      )}
                    </CardContent>
                    <div className="p-4 pt-0 flex gap-2">
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
                return (
                  <Card key={t.id} className="flex flex-col border-primary/20">
                    <CardContent className="pt-6 flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs text-muted-foreground font-mono">{t.reference}</div>
                          <div className="font-semibold text-sm flex items-center gap-1">
                            <Building2 className="h-4 w-4 text-primary" />
                            {t.market}
                          </div>
                        </div>
                        {deadlineBadge(t.deadline_answer)}
                      </div>
                      <div className="space-y-1">
                        {t.category && <Badge variant="secondary">{t.category}</Badge>}
                        {t.designation_origin && <div className="text-sm font-medium">{t.designation_origin}</div>}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {t.price && <div><span className="text-muted-foreground">Prix :</span> {t.price}</div>}
                        {t.available_volume && <div><span className="text-muted-foreground">Volume :</span> {t.available_volume}</div>}
                        {t.vintage && <div><span className="text-muted-foreground">Millésime :</span> {t.vintage}</div>}
                        {t.deadline_sample && <div><span className="text-muted-foreground">Échantillon :</span> {t.deadline_sample}</div>}
                      </div>
                      {t.style_profile && (
                        <p className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-2 italic">{t.style_profile}</p>
                      )}
                      {t.requirements && (
                        <p className="text-xs text-muted-foreground">{t.requirements}</p>
                      )}
                    </CardContent>
                    <div className="p-4 pt-0 flex gap-2">
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