import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCredits } from '@/hooks/useCredits';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, Loader2, Download, Clock, CheckCircle2, Archive, FileSearch, Eye } from 'lucide-react';
import { StatesMultiSelect } from '@/components/sourcing/StatesMultiSelect';
import { SourcingResultsDialog } from '@/components/sourcing/SourcingResultsDialog';
import { PremiumOnlyState } from '@/components/PremiumOnlyState';
import { formatDateLong } from '@/lib/format';
import { COUNTRIES } from '@/components/importers/country-data';

// Build a lookup: lowercased DB country name/alias -> { fr, en } display label
const COUNTRY_LABELS: Record<string, { fr: string; en: string }> = (() => {
  const map: Record<string, { fr: string; en: string }> = {};
  for (const c of COUNTRIES) {
    const labels = { fr: c.name, en: c.englishName };
    const keys = new Set<string>([c.name, c.englishName, ...(c.dbAliases || [])]);
    for (const k of keys) {
      if (!k) continue;
      map[k.trim().toLowerCase()] = labels;
    }
  }
  return map;
})();

function translateCountry(raw: string, lang: string): string {
  if (!raw) return raw;
  const entry = COUNTRY_LABELS[raw.trim().toLowerCase()];
  if (!entry) return raw;
  return lang.startsWith('en') ? entry.en : entry.fr;
}

interface SourcingRequest {
  id: string;
  target_market: string;
  status: 'pending' | 'in_progress' | 'validated' | 'archived';
  admin_note: string | null;
  result_file_url: string | null;
  result_file_name: string | null;
  result_file_format: string | null;
  validated_at: string | null;
  created_at: string;
  result_json: any | null;
  result_summary: string | null;
  states_filter: string[] | null;
  error_message: string | null;
}

// Country names (as stored in buyer_contacts, lowercased) that require a state filter
const STATES_REQUIRED_NAMES = new Set([
  'united states', 'usa',
  'united kingdom', 'england (uk)', 'scotland (uk)', 'wales (uk)', 'northern ireland (uk)',
  'germany', 'australia', 'canada', 'china',
]);

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  pending: 'secondary',
  in_progress: 'outline',
  validated: 'default',
  archived: 'secondary',
};

export default function SourcingRequests() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { hasPaidAccess, loading: subLoading } = useSubscription();
  const { searchCredits, consumeSearchCredit, noCreditsMessage, resetDateLabel } = useCredits();
  const [requests, setRequests] = useState<SourcingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [market, setMarket] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [states, setStates] = useState<string[]>([]);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [activeReq, setActiveReq] = useState<SourcingRequest | null>(null);
  const [countryOptions, setCountryOptions] = useState<{ canonical: string; variants: string[] }[]>([]);

  // Load distinct countries directly from buyer_contacts to guarantee consistency
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // PostgREST caps responses at 1000 rows by default; paginate to fetch all countries
      const PAGE_SIZE = 1000;
      const groups = new Map<string, { canonical: string; variants: Set<string> }>();
      let from = 0;
      // Hard safety cap to avoid infinite loops
      for (let i = 0; i < 200; i++) {
        const { data, error } = await supabase
          .from('buyer_contacts')
          .select('country')
          .not('country', 'is', null)
          .order('country', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (cancelled) return;
        if (error || !data) break;
        for (const row of data as { country: string }[]) {
          const raw = row.country;
          if (!raw) continue;
          const trimmed = raw.trim();
          if (!trimmed) continue;
          const key = trimmed.toLowerCase();
          if (!groups.has(key)) groups.set(key, { canonical: trimmed, variants: new Set() });
          groups.get(key)!.variants.add(raw);
        }
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      if (cancelled) return;
      const list = Array.from(groups.values())
        .map(g => ({ canonical: g.canonical, variants: Array.from(g.variants) }))
        .sort((a, b) => a.canonical.localeCompare(b.canonical));
      setCountryOptions(list);
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('sourcing_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) console.error(error);
    setRequests((data as any) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Realtime refresh on status changes
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`sourcing-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sourcing_requests', filter: `user_id=eq.${user.id}` }, () => {
        fetchRequests();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, fetchRequests]);

  const selectedOption = countryOptions.find(c => c.canonical === market);
  const needsStates = !!selectedOption && STATES_REQUIRED_NAMES.has(selectedOption.canonical.toLowerCase());
  const countryDbNames = selectedOption ? selectedOption.variants : [];

  const handleSubmit = async () => {
    if (!user || !market) return;
    if (needsStates && states.length === 0) {
      toast({ title: t('common.error'), description: t('sourcing.states.required'), variant: 'destructive' });
      return;
    }
    if (searchCredits <= 0) {
      toast({ title: t('sourcing.toast.noCredit'), description: noCreditsMessage('search'), variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { data: inserted, error } = await supabase
        .from('sourcing_requests')
        .insert({
          user_id: user.id,
          target_market: market,
          states_filter: needsStates ? states : null,
        })
        .select('id')
        .single();
      if (error) throw error;
      try {
        await supabase.functions.invoke('notify-sourcing-submission', {
          body: { requestId: inserted?.id, userEmail: user.email, targetMarket: market },
        });
      } catch (e) { console.error(e); }
      // Trigger AI processing (fire and forget — function decrements credit itself)
      try {
        supabase.functions.invoke('process-sourcing-request', {
          body: { sourcing_request_id: inserted?.id },
        });
      } catch (e) { console.error(e); }
      setOpen(false);
      setMarket('');
      setStates([]);
      toast({ title: t('sourcing.toast.submittedTitle'), description: t('sourcing.toast.submittedDesc') });
      fetchRequests();
    } catch (e) {
      console.error(e);
      toast({ title: t('common.error'), description: t('sourcing.toast.error'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (req: SourcingRequest) => {
    if (!req.result_file_url) return;
    setDownloadingId(req.id);
    try {
      const { data, error } = await supabase
        .storage
        .from('sourcing-results')
        .createSignedUrl(req.result_file_url, 60 * 10);
      if (error || !data?.signedUrl) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (e) {
      console.error(e);
      toast({ title: t('common.error'), description: t('sourcing.toast.downloadError'), variant: 'destructive' });
    } finally {
      setDownloadingId(null);
    }
  };

  const marketLabel = (value: string) => translateCountry(value, i18n.language);

  if (subLoading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasPaidAccess) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <PremiumOnlyState />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('sourcing.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('sourcing.subtitle')}</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Target className="h-4 w-4 mr-2" />
              {t('sourcing.cta')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('sourcing.dialog.title')}</DialogTitle>
              <DialogDescription>{t('sourcing.dialog.description')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t('sourcing.dialog.marketLabel')}</label>
                <Select value={market} onValueChange={(v) => { setMarket(v); setStates([]); }}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('sourcing.dialog.marketPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[280px] overflow-y-auto">
                    {[...countryOptions]
                      .sort((a, b) =>
                        translateCountry(a.canonical, i18n.language).localeCompare(
                          translateCountry(b.canonical, i18n.language),
                          i18n.language
                        )
                      )
                      .map(c => (
                        <SelectItem key={c.canonical} value={c.canonical}>
                          {translateCountry(c.canonical, i18n.language)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {needsStates && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    {t('sourcing.states.label')} <span className="text-destructive">*</span>
                  </label>
                  <StatesMultiSelect
                    countryNames={countryDbNames}
                    value={states}
                    onChange={setStates}
                    max={3}
                  />
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('sourcing.dialog.creditRemaining')}</span>
                <Badge variant={searchCredits > 0 ? 'default' : 'secondary'}>{searchCredits} / 1</Badge>
              </div>
              {searchCredits <= 0 && <p className="text-sm text-destructive">{noCreditsMessage('search')}</p>}
              <Button className="w-full" disabled={!market || searchCredits <= 0 || submitting || (needsStates && states.length === 0)} onClick={handleSubmit}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Target className="h-4 w-4 mr-2" />}
                {t('sourcing.dialog.submit')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6">
        <CardContent className="py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{t('sourcing.monthlyCredit')}</p>
            <p className="text-xs text-muted-foreground">{t('sourcing.resetOn', { date: resetDateLabel })}</p>
          </div>
          <Badge variant={searchCredits > 0 ? 'default' : 'secondary'} className="text-base px-3 py-1">
            {searchCredits} / 1
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('sourcing.history')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileSearch className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">{t('sourcing.empty')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(req => (
                <div key={req.id} className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{marketLabel(req.target_market)}</span>
                      {req.states_filter && req.states_filter.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({req.states_filter.join(', ')})
                        </span>
                      )}
                      <Badge variant={STATUS_VARIANTS[req.status]}>
                        {req.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                        {req.status === 'in_progress' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                        {req.status === 'validated' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {req.status === 'archived' && <Archive className="h-3 w-3 mr-1" />}
                        {t(`sourcing.status.${req.status}`)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('sourcing.requestedOn', { date: formatDateLong(req.created_at) })}
                    </p>
                    {req.status === 'pending' && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{t('sourcing.waitingMessage')}</p>
                    )}
                    {req.status === 'in_progress' && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{t('sourcing.processing.label')}</p>
                    )}
                    {req.error_message && (
                      <p className="text-xs text-destructive mt-1">{req.error_message}</p>
                    )}
                    {req.admin_note && (
                      <p className="text-xs mt-2 p-2 bg-muted rounded">{req.admin_note}</p>
                    )}
                  </div>
                  {req.status === 'validated' && req.result_json && (
                    <Button
                      size="sm"
                      onClick={() => { setActiveReq(req); setResultsOpen(true); }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {t('sourcing.results.viewBtn')}
                    </Button>
                  )}
                  {req.status === 'validated' && req.result_file_url && !req.result_json && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(req)}
                      disabled={downloadingId === req.id}
                    >
                      {downloadingId === req.id
                        ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        : <Download className="h-4 w-4 mr-2" />}
                      {t('sourcing.download')}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SourcingResultsDialog
        open={resultsOpen}
        onOpenChange={setResultsOpen}
        summary={activeReq?.result_summary ?? null}
        resultJson={activeReq?.result_json ?? null}
        marketLabel={activeReq ? marketLabel(activeReq.target_market) : ''}
      />
    </div>
  );
}