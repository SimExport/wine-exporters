import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Mail, Phone, MapPin, Plus, CheckCircle2, Eye, Archive, ArchiveRestore, Search, RotateCcw, Send, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { normalizeText, canonicalCountry, countryLabel, splitMulti, buildOptions, matchesFilters, hasActiveFilters, EMPTY_FILTERS, isMediatedEmail, buildMailto, type FilterState, type FilterableItem } from '@/lib/opportunity-filters';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays, format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { SEO } from '@/components/SEO';
import { getOrCreateManualCampaign } from '@/lib/manual-campaign';
import { opportunityKey, partitionOpportunities, type OpportunityType } from '@/lib/opportunity-archives';

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

function ExpandableText({ text, more, less }: { text: string; more: string; less: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [overflow, setOverflow] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && !open) setOverflow(el.scrollHeight > el.clientHeight + 1);
  }, [text, open]);
  return (
    <div>
      <p ref={ref} className={`text-[15px] leading-relaxed text-foreground whitespace-pre-line ${open ? '' : 'line-clamp-3'}`}>{text}</p>
      {(overflow || open) && (
        <button type="button" className="mt-1 text-sm font-medium text-primary underline-offset-4 hover:underline" aria-expanded={open} onClick={() => setOpen(o => !o)}>
          {open ? less : more}
        </button>
      )}
    </div>
  );
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
  created_at: string;
  wine_styles_fr: string | null;
  wine_styles_en: string | null;
  origins_fr: string | null;
  origins_en: string | null;
  volume_fr: string | null;
  volume_en: string | null;
  requirements_fr: string | null;
  requirements_en: string | null;
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
  created_at: string;
  category_fr: string | null;
  category_en: string | null;
  designation_origin_fr: string | null;
  designation_origin_en: string | null;
  available_volume_fr: string | null;
  available_volume_en: string | null;
  style_profile_fr: string | null;
  style_profile_en: string | null;
  requirements_fr: string | null;
  requirements_en: string | null;
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
  const [archivedKeys, setArchivedKeys] = useState<Set<string>>(new Set());
  const [archivePending, setArchivePending] = useState<Set<string>>(new Set());
  const [archivesReady, setArchivesReady] = useState(false);
  const [viewedKeys, setViewedKeys] = useState<Set<string>>(new Set());
  const [contactDialog, setContactDialog] = useState<
    | { kind: 'importer'; data: ImporterRequest }
    | { kind: 'tender'; data: TenderRequest }
    | null
  >(null);
  const [tab, setTab] = useState('direct');
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setArchivesReady(false);
      setArchivedKeys(new Set());
      const [imp, ten, leads, views, archives] = await Promise.all([
        supabase
          .from('importer_requests')
          .select('*, created_at')
          .eq('status', 'published')
          .order('created_at', { ascending: false, nullsFirst: false }),
        supabase
          .from('tender_requests')
          .select('*, created_at, agent:tender_agents(name, company, email, phone, address)')
          .eq('status', 'published')
          .order('created_at', { ascending: false, nullsFirst: false }),
        supabase
          .from('leads')
          .select('source_ref')
          .eq('created_by', user.id)
          .not('source_ref', 'is', null),
        supabase
          .from('opportunity_views')
          .select('opportunity_type, opportunity_id')
          .eq('user_id', user.id),
        supabase.from('opportunity_archives').select('opportunity_type, opportunity_id').eq('user_id', user.id),
      ]);
      if (archives.error) {
        toast({ title: tr('opportunitiesPage.toast.archiveError'), variant: 'destructive' });
      } else {
        setArchivedKeys(new Set((archives.data ?? []).map(row => `${row.opportunity_type}:${row.opportunity_id}`)));
        setArchivesReady(true);
      }
      setImporters((imp.data ?? []) as any);
      setTenders((ten.data ?? []) as any);
      setAddedRefs(new Set((leads.data ?? []).map((l: any) => l.source_ref)));
      setViewedKeys(new Set((views.data ?? []).map((v: any) => `${v.opportunity_type}:${v.opportunity_id}`)));
    })();
  }, [user]);

  const toggleArchive = async (type: OpportunityType, id: string) => {
    if (!user || !archivesReady) return;
    const key = opportunityKey(type, id);
    if (archivePending.has(key)) return;
    const restoring = archivedKeys.has(key);
    setArchivePending(prev => new Set(prev).add(key));
    try {
      // Ownership comes from auth.uid() on insert and is enforced by RLS.
      const { error } = restoring
        ? await supabase.from('opportunity_archives').delete().eq('user_id', user.id).eq('opportunity_type', type).eq('opportunity_id', id)
        : await supabase.from('opportunity_archives').upsert({ opportunity_type: type, opportunity_id: id }, { onConflict: 'user_id,opportunity_type,opportunity_id', ignoreDuplicates: true });
      if (error) throw error;
      setArchivedKeys(prev => {
        const next = new Set(prev);
        if (restoring) next.delete(key); else next.add(key);
        return next;
      });
      toast({ title: tr(`opportunitiesPage.toast.${restoring ? 'restored' : 'archived'}`) });
    } catch {
      toast({ title: tr('opportunitiesPage.toast.archiveError'), variant: 'destructive' });
    } finally {
      setArchivePending(prev => { const next = new Set(prev); next.delete(key); return next; });
    }
  };

  const archiveButton = (type: OpportunityType, id: string) => {
    const key = opportunityKey(type, id);
    const archived = archivedKeys.has(key);
    const label = tr(`opportunitiesPage.actions.${archived ? 'restore' : 'archive'}`);
    return <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" disabled={!archivesReady || archivePending.has(key)} onClick={() => toggleArchive(type, id)}>
      {archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}{label}
    </Button>;
  };

  const markViewed = async (type: 'importer' | 'tender', id: string) => {
    if (!user) return;
    const key = `${type}:${id}`;
    if (viewedKeys.has(key)) return;
    setViewedKeys(prev => new Set(prev).add(key));
    await supabase
      .from('opportunity_views')
      .upsert(
        { user_id: user.id, opportunity_type: type, opportunity_id: id },
        { onConflict: 'user_id,opportunity_type,opportunity_id', ignoreDuplicates: true }
      );
  };

  const addImporterToCrm = async (r: ImporterRequest) => {
    if (!user) return;
    try {
      await markViewed('importer', r.id);
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
      toast({ title: tr('opportunitiesPage.toast.added'), description: r.company_name });
    } catch (e: any) {
      toast({ title: tr('opportunitiesPage.toast.error'), description: e.message, variant: 'destructive' });
    }
  };

  const addTenderToCrm = async (t: TenderRequest) => {
    if (!user || !t.agent) return;
    try {
      await markViewed('tender', t.id);
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
      toast({ title: tr('opportunitiesPage.toast.added'), description: `${t.reference} — ${t.agent.company}` });
    } catch (e: any) {
      toast({ title: tr('opportunitiesPage.toast.error'), description: e.message, variant: 'destructive' });
    }
  };

  const deadlineBadge = (date: string | null) => {
    if (!date) return null;
    const days = differenceInDays(new Date(date), new Date());
    if (days < 0) return <Badge variant="outline">{tr('opportunitiesPage.states.closed')}</Badge>;
    const lbl = tr('opportunitiesPage.states.daysLeft', { count: days });
    if (days < 30) return <Badge variant="destructive">{lbl}</Badge>;
    if (days < 60) return <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-transparent">{lbl}</Badge>;
    return <Badge variant="secondary">{lbl}</Badge>;
  };

  const dateLocale = i18n.language === 'en' ? enUS : fr;
  const lang = i18n.language?.startsWith('en') ? 'en' : 'fr';
  const pick = (row: any, base: string): string | null => {
    return row?.[`${base}_${lang}`] ?? row?.[base] ?? null;
  };

  const labelCol = "text-xs font-medium uppercase tracking-wide text-muted-foreground";
  const chip = "rounded-full px-3 py-1 text-[13px] leading-tight";
  const ui = (k: string, o?: any) => tr(`opportunitiesUi.${k}`, o) as string;
  const locale = lang === 'en' ? 'en' : 'fr';

  const importerItem = (r: ImporterRequest): FilterableItem => ({
    country: canonicalCountry(r.country),
    styles: splitMulti(pick(r, 'wine_styles')),
    origins: splitMulti(pick(r, 'origins')),
    haystack: [r.company_name, r.country, pick(r, 'wine_styles'), pick(r, 'origins'), pick(r, 'volume'), pick(r, 'requirements'), r.wine_styles, r.origins, r.requirements].filter(Boolean).join(' '),
  });
  const tenderItem = (t: TenderRequest): FilterableItem => ({
    country: canonicalCountry(t.market),
    styles: splitMulti(pick(t, 'category')),
    origins: splitMulti(pick(t, 'designation_origin')),
    haystack: [t.reference, t.market, t.agent?.company, pick(t, 'category'), pick(t, 'designation_origin'), pick(t, 'style_profile'), pick(t, 'requirements'), t.vintage, t.price].filter(Boolean).join(' '),
  });
  const scopeItems: { item: FilterableItem; raw: string }[] = tab === 'tender'
    ? tenders.map(t => ({ item: tenderItem(t), raw: t.market }))
    : tab === 'direct' ? importers.map(r => ({ item: importerItem(r), raw: r.country ?? '' }))
    : [...importers.map(r => ({ item: importerItem(r), raw: r.country ?? '' })), ...tenders.map(t => ({ item: tenderItem(t), raw: t.market }))];
  const countryOptions = (() => {
    const m = new Map<string, string>();
    for (const { item, raw } of scopeItems) if (item.country && !m.has(item.country)) m.set(item.country, countryLabel(item.country, raw, locale));
    return [...m].map(([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label, locale));
  })();
  const styleOptions = buildOptions(scopeItems.map(x => x.item.styles), locale);
  const originOptions = buildOptions(scopeItems.map(x => x.item.origins), locale);
  const activeFilters = hasActiveFilters(filters);
  const fImporters = (rows: ImporterRequest[]) => rows.filter(r => matchesFilters(importerItem(r), filters));
  const fTenders = (rows: TenderRequest[]) => rows.filter(t => matchesFilters(tenderItem(t), filters));
  const changeTab = (v: string) => { setTab(v); setFilters(f => ({ ...EMPTY_FILTERS, q: f.q })); };

  const mailtoFor = (c: NonNullable<typeof contactDialog>) => {
    if (c.kind === 'importer') {
      const need = [pick(c.data, 'wine_styles'), pick(c.data, 'origins')].filter(Boolean).join(', ');
      return buildMailto(c.data.email, ui('mailSubjectImporter', { company: c.data.company_name }), ui('mailBody', { need: need ? ` (${need})` : '' }));
    }
    const need = [pick(c.data, 'category'), pick(c.data, 'designation_origin')].filter(Boolean).join(', ');
    return buildMailto(c.data.agent?.email ?? '', ui('mailSubjectTender', { reference: c.data.reference }), ui('mailBody', { need: ` – ${c.data.reference}${need ? ` (${need})` : ''}` }));
  };

  const importersPartition = partitionOpportunities(importers, 'importer', archivedKeys);
  const tendersPartition = partitionOpportunities(tenders, 'tender', archivedKeys);
  const renderImporters = (rows: ImporterRequest[]) => rows.map(r => {
                const added = addedRefs.has(r.id);
                const viewed = viewedKeys.has(`importer:${r.id}`);
                const req = (pick(r, 'requirements') ?? '').trim();
                const styles = splitMulti(pick(r, 'wine_styles'));
                const origins = splitMulti(pick(r, 'origins'));
                const volumeDisplay = pick(r, 'volume');
                return (
                  <Card key={r.id} className="flex flex-col">
                    <CardContent className="pt-5 px-5 pb-4 flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-lg font-bold leading-snug text-foreground break-words">{r.company_name || '—'}</h3>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[15px] text-muted-foreground">
                            <span className="text-lg leading-none" aria-hidden>{countryFlag(r.country)}</span>
                            <span>{r.country ? countryLabel(canonicalCountry(r.country), r.country, locale) : '—'}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {r.created_at && (
                            <span className="text-[13px] text-muted-foreground">
                              {format(new Date(r.created_at), 'd MMM yyyy', { locale: dateLocale })}
                            </span>
                          )}
                          {viewed && (
                            <Badge variant="secondary" className="gap-1 text-[13px] px-2 py-0.5 font-normal">
                              <Eye className="h-3.5 w-3.5" />
                              {tr('opportunitiesPage.states.seen')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {req && <ExpandableText text={req} more={ui('showMore')} less={ui('showLess')} />}
                      {styles.length > 0 && (
                        <div>
                          <div className={`${labelCol} mb-1.5`}>{tr('opportunitiesPage.labels.search')}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {styles.map((s, i) => (
                              <span key={i} className={`bg-primary text-primary-foreground ${chip}`}>{s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {origins.length > 0 && (
                        <div>
                          <div className={`${labelCol} mb-1.5`}>{tr('opportunitiesPage.labels.origin')}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {origins.map((s, i) => (
                              <span key={i} className={`bg-muted text-primary border border-primary/25 ${chip}`}>{s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {r.volume && (
                        <div>
                          <div className={`${labelCol} mb-1.5`}>{tr('opportunitiesPage.labels.volume')}</div>
                          <span className={`bg-gold text-gold-foreground font-medium inline-block ${chip}`}>{volumeDisplay}</span>
                        </div>
                      )}
                    </CardContent>
                    <div className="px-5 pb-2 flex gap-2">
                      <Button variant="outline" className="flex-1 text-sm" onClick={() => { markViewed('importer', r.id); setContactDialog({ kind: 'importer', data: r }); }}>
                        {tr('opportunitiesPage.actions.reply')}
                      </Button>
                      <Button className="flex-1 text-sm" disabled={added} onClick={() => addImporterToCrm(r)}>
                        {added ? <><CheckCircle2 className="h-4 w-4 mr-1" />{tr('opportunitiesPage.actions.added')}</> : <><Plus className="h-4 w-4 mr-1" />{tr('opportunitiesPage.actions.addToCrm')}</>}
                      </Button>
                    </div>
                    <div className="px-3 pb-2 flex justify-end">{archiveButton('importer', r.id)}</div>
                  </Card>
                );
              });

  const renderTenders = (rows: TenderRequest[]) => rows.map(t => {
                const added = addedRefs.has(t.id);
                const viewed = viewedKeys.has(`tender:${t.id}`);
                const styleProfile = (pick(t, 'style_profile') ?? '').trim();
                const tReq = (pick(t, 'requirements') ?? '').trim();
                const tCategory = pick(t, 'category');
                const tDesignation = pick(t, 'designation_origin');
                const tVolume = pick(t, 'available_volume');
                const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
                  <div className="flex items-baseline gap-2">
                    <span className={`${labelCol} w-32 shrink-0`}>{label}</span>
                    <div className="flex-1 min-w-0">{children}</div>
                  </div>
                );
                return (
                  <Card key={t.id} className="flex flex-col border-primary/20">
                    <CardContent className="pt-5 px-5 pb-4 flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-lg font-bold leading-snug text-foreground break-words">{t.agent?.company || t.reference}</h3>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[15px] text-muted-foreground">
                            <span className="flex items-center gap-1.5"><span className="text-lg leading-none" aria-hidden>{countryFlag(t.market)}</span>{countryLabel(canonicalCountry(t.market), t.market, locale)}</span>
                            <span className="font-mono text-[13px]">{t.reference}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1 text-[13px]">
                          {deadlineBadge(t.deadline_answer)}
                          {t.created_at && (
                            <span className="text-muted-foreground">
                              {format(new Date(t.created_at), 'd MMM yyyy', { locale: dateLocale })}
                            </span>
                          )}
                          {viewed && (
                            <Badge variant="secondary" className="gap-1 text-[13px] px-2 py-0.5 font-normal">
                              <Eye className="h-3.5 w-3.5" />
                              {tr('opportunitiesPage.states.seen')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {(t.category || t.designation_origin) && (
                        <div className="flex flex-wrap gap-1.5">
                          {t.category && <span className={`bg-primary text-primary-foreground ${chip}`} title={tr('opportunitiesPage.labels.category')}>{tCategory}</span>}
                          {t.designation_origin && <span className={`bg-muted text-primary border border-primary/25 ${chip}`} title={tr('opportunitiesPage.labels.originDesignation')}>{tDesignation}</span>}
                        </div>
                      )}
                      {styleProfile && <ExpandableText text={styleProfile} more={ui('showMore')} less={ui('showLess')} />}
                      <div className="space-y-1.5 text-sm">
                        {t.price && (
                          <Row label={tr('opportunitiesPage.labels.price')}>
                            <span className="font-medium text-foreground">{t.price}</span>
                          </Row>
                        )}
                        {t.available_volume && (
                          <Row label={tr('opportunitiesPage.labels.availableVolume')}>
                            <span className={`bg-gold text-gold-foreground font-medium inline-block ${chip}`}>{tVolume}</span>
                          </Row>
                        )}
                        {t.vintage && (
                          <Row label={tr('opportunitiesPage.labels.vintage')}>
                            <span className="text-foreground">{t.vintage}</span>
                          </Row>
                        )}
                        {t.deadline_sample && (
                          <Row label={tr('opportunitiesPage.labels.sampleDeadline')}>
                            <span className="text-foreground">{t.deadline_sample}</span>
                          </Row>
                        )}
                      </div>
                      {tReq && <ExpandableText text={tReq} more={ui('showMore')} less={ui('showLess')} />}
                    </CardContent>
                    <div className="px-5 pb-2 flex gap-2">
                      <Button variant="outline" className="flex-1 text-sm" onClick={() => { markViewed('tender', t.id); setContactDialog({ kind: 'tender', data: t }); }}>
                        {tr('opportunitiesPage.actions.reply')}
                      </Button>
                      <Button className="flex-1 text-sm" disabled={added || !t.agent} onClick={() => addTenderToCrm(t)}>
                        {added ? <><CheckCircle2 className="h-4 w-4 mr-1" />{tr('opportunitiesPage.actions.added')}</> : <><Plus className="h-4 w-4 mr-1" />{tr('opportunitiesPage.actions.addToCrm')}</>}
                      </Button>
                    </div>
                    <div className="px-3 pb-2 flex justify-end">{archiveButton('tender', t.id)}</div>
                  </Card>
                );
              });

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <SEO
        title={tr('opportunitiesPage.seoTitle')}
        description={tr('opportunitiesPage.seoDescription')}
        path="/opportunites"
      />
      <header className="rounded-xl border border-primary/15 bg-card px-5 py-5 md:px-7 md:py-6">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">{ui('heroKicker')}</div>
        <h1 className="mt-1 text-3xl font-semibold text-foreground" style={{ fontFamily: 'Georgia, serif' }}>
          {tr('opportunitiesPage.pageTitle')}
        </h1>
        <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
          <div className="flex items-baseline gap-2"><span className="text-3xl font-bold text-primary tabular-nums">{importers.length}</span><span className="text-[15px] text-foreground">{ui('buyerRequests', { count: importers.length })}</span></div>
          <div className="flex items-baseline gap-2"><span className="text-3xl font-bold text-primary tabular-nums">{tenders.length}</span><span className="text-[15px] text-foreground">{ui('tenders', { count: tenders.length })}</span></div>
        </div>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">{ui('heroText')}</p>
      </header>

      <Tabs value={tab} onValueChange={changeTab} className="w-full">
        <TabsList className="h-auto flex flex-wrap justify-start gap-1">
          <TabsTrigger value="direct" className="text-sm">{tr('opportunitiesPage.tabs.direct')} ({fImporters(importersPartition.active).length})</TabsTrigger>
          <TabsTrigger value="tender" className="text-sm">{tr('opportunitiesPage.tabs.tender')} ({fTenders(tendersPartition.active).length})</TabsTrigger>
          <TabsTrigger value="archives" className="text-sm"><Archive className="h-4 w-4 mr-2" />{tr('opportunitiesPage.tabs.archives')} ({fImporters(importersPartition.archived).length + fTenders(tendersPartition.archived).length})</TabsTrigger>
        </TabsList>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={filters.q} onChange={e => setFilters(f => ({ ...f, q: e.target.value }))} placeholder={ui('searchPlaceholder')} aria-label={ui('searchPlaceholder')} className="h-10 pl-9 text-sm" />
          </div>
            <Select value={filters.country || '__all'} onValueChange={v => setFilters(f => ({ ...f, country: v === '__all' ? '' : v }))}>
              <SelectTrigger className="h-10 text-sm" aria-label={ui('country')}><SelectValue placeholder={ui('country')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">{ui('country')} : {ui('all')}</SelectItem>
                {countryOptions.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.style || '__all'} onValueChange={v => setFilters(f => ({ ...f, style: v === '__all' ? '' : v }))}>
              <SelectTrigger className="h-10 text-sm" aria-label={ui('style')}><SelectValue placeholder={ui('style')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">{ui('style')} : {ui('all')}</SelectItem>
                {styleOptions.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.origin || '__all'} onValueChange={v => setFilters(f => ({ ...f, origin: v === '__all' ? '' : v }))}>
              <SelectTrigger className="h-10 text-sm" aria-label={ui('origin')}><SelectValue placeholder={ui('origin')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">{ui('origin')} : {ui('all')}</SelectItem>
                {originOptions.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          <Button variant="ghost" className="h-10 gap-2 text-sm" disabled={!activeFilters} onClick={() => setFilters(EMPTY_FILTERS)}>
            <RotateCcw className="h-4 w-4" />{ui('reset')}
          </Button>
        </div>

        <TabsContent value="direct" className="mt-5">
          {importersPartition.active.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">{tr('opportunitiesPage.states.emptyDirect')}</CardContent></Card>
          ) : fImporters(importersPartition.active).length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">{ui('noResults')}</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderImporters(fImporters(importersPartition.active))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tender" className="mt-5">
          {tendersPartition.active.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">{tr('opportunitiesPage.states.emptyTender')}</CardContent></Card>
          ) : fTenders(tendersPartition.active).length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">{ui('noResults')}</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderTenders(fTenders(tendersPartition.active))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="archives" className="mt-5 space-y-6">
          {fImporters(importersPartition.archived).length + fTenders(tendersPartition.archived).length === 0 && (
            <div className="py-12 text-center text-muted-foreground"><Archive className="h-8 w-8 mx-auto mb-3" />{activeFilters ? ui('noResults') : tr('opportunitiesPage.states.emptyArchives')}</div>
          )}
          {fImporters(importersPartition.archived).length > 0 && <section className="space-y-4">
            <h2 className="font-semibold">{tr('opportunitiesPage.tabs.direct')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{renderImporters(fImporters(importersPartition.archived))}</div>
          </section>}
          {fTenders(tendersPartition.archived).length > 0 && <section className="space-y-4">
            <h2 className="font-semibold">{tr('opportunitiesPage.tabs.tender')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{renderTenders(fTenders(tendersPartition.archived))}</div>
          </section>}
        </TabsContent>
      </Tabs>

      <div className="mt-8 rounded-md bg-muted/40 border border-border/50 px-4 py-3 text-center text-xs text-muted-foreground">
        {tr('opportunitiesPage.commissionNotice')}
      </div>

      <Dialog open={!!contactDialog} onOpenChange={(o) => !o && setContactDialog(null)}>
        <DialogContent>
          {contactDialog?.kind === 'importer' && (
            <>
              <DialogHeader>
                <DialogTitle>{contactDialog.data.company_name}</DialogTitle>
                <DialogDescription>
                  {tr('opportunitiesPage.dialog.directDescription', { name: contactDialog.data.full_name })}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                {isMediatedEmail(contactDialog.data.email) && (
                  <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-muted/50 p-3"><ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /><span>{ui('mediated')}</span></div>
                )}
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /><a className="underline" href={`mailto:${contactDialog.data.email}`}>{contactDialog.data.email}</a></div>
                {contactDialog.data.phone && !isMediatedEmail(contactDialog.data.email) && (
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /><a className="underline" href={`tel:${contactDialog.data.phone}`}>{contactDialog.data.phone}</a></div>
                )}
              </div>
            </>
          )}
          {contactDialog?.kind === 'tender' && contactDialog.data.agent && (
            <>
              <DialogHeader>
                <DialogTitle>{tr('opportunitiesPage.dialog.tenderTitle')}</DialogTitle>
                <DialogDescription>
                  {tr('opportunitiesPage.dialog.tenderDescription', { reference: contactDialog.data.reference })}
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
          {contactDialog && (contactDialog.kind === 'importer' ? contactDialog.data.email : contactDialog.data.agent?.email) && (
            <div className="space-y-1.5 border-t pt-3">
              <Button asChild className="w-full gap-2 text-sm">
                <a href={mailtoFor(contactDialog)}><Send className="h-4 w-4" />{ui('prepareEmail')}</a>
              </Button>
              <p className="text-[13px] text-muted-foreground">{ui('prepareHint')}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
