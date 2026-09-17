import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Loader2, Eye, ExternalLink, Mail, Phone } from 'lucide-react';
import { COUNTRIES as COUNTRY_LIST } from '@/components/importers/CountrySelector';
import { formatDateLong } from '@/lib/format';

interface ShortlistItem {
  buyer_contact_id?: string | null;
  company_name?: string | null;
  city?: string | null;
  country?: string | null;
  website_url?: string | null;
  score?: number | null;
  reason?: string | null;
}

interface ResultJson {
  shortlist?: ShortlistItem[];
  market_summary?: string | null;
  recommended_approach?: string[];
}

interface MarketSearch {
  id: string;
  created_at: string;
  winery_name: string | null;
  contact_name: string | null;
  email: string | null;
  website: string | null;
  winery_location: string | null;
  wine_types: string[] | null;
  appellations_cuvees: string | null;
  export_price_range: string | null;
  certifications: string[] | null;
  target_country: string | null;
  importer_preferences: string[] | null;
  exclusions: string | null;
  additional_context: string | null;
  status: string;
  source: string | null;
  campaign: string | null;
  referrer: string | null;
  result_json: ResultJson | null;
  result_summary: string | null;
  processing_error: string | null;
  processed_at: string | null;
}

interface ContactInfo {
  id: string;
  email: string | null;
  phone: string | null;
  website_url: string | null;
  full_address: string | null;
}

type FilterKey = 'all' | 'completed' | 'failed' | 'today' | 'week';

const FILTERS: FilterKey[] = ['all', 'completed', 'failed', 'today', 'week'];

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  new: 'secondary',
  processing: 'outline',
  completed: 'default',
  failed: 'destructive',
};

const PAGE_SIZE = 10;

export default function AdminMarketAnalyses() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<MarketSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [active, setActive] = useState<MarketSearch | null>(null);
  const [contacts, setContacts] = useState<Record<string, ContactInfo>>({});
  const [showRaw, setShowRaw] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('prospect_market_searches')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      setRows([]);
    } else {
      setRows(((data as any[]) || []) as MarketSearch[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const marketLabel = (code: string | null) =>
    (code && (COUNTRY_LIST.find(c => c.code === code)?.name || code)) || '—';

  const shortlistOf = (r: MarketSearch) => r.result_json?.shortlist ?? [];

  const avgScore = (r: MarketSearch) => {
    const scores = shortlistOf(r).map(s => Number(s.score)).filter(n => Number.isFinite(n));
    if (!scores.length) return null;
    return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
  };

  const filtered = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (filter === 'completed' && r.status !== 'completed') return false;
      if (filter === 'failed' && r.status !== 'failed') return false;
      if (filter === 'today' && new Date(r.created_at).getTime() < startOfToday) return false;
      if (filter === 'week' && new Date(r.created_at).getTime() < weekAgo) return false;
      if (q) {
        const haystack = `${r.winery_name ?? ''} ${r.email ?? ''} ${r.contact_name ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [filter, search]);

  const openDetail = async (row: MarketSearch) => {
    setActive(row);
    setShowRaw(false);
    const ids = shortlistOf(row)
      .map(s => s.buyer_contact_id)
      .filter((v): v is string => !!v);
    if (!ids.length) return;
    const { data, error } = await supabase
      .from('buyer_contacts')
      .select('id, email, phone, website_url, full_address')
      .in('id', ids);
    if (error) {
      console.error(error);
      return;
    }
    setContacts(Object.fromEntries(((data as any[]) || []).map(c => [c.id, c as ContactInfo])));
  };

  const optionLabel = (group: string, value: string) =>
    t(`marketAnalysis.options.${group}.${value}`, { defaultValue: value });

  const listLabels = (group: string, values: string[] | null) =>
    values && values.length ? values.map(v => optionLabel(group, v)).join(', ') : '—';

  const detailRows = (r: MarketSearch): Array<[string, string]> => [
    [t('adminMarketAnalyses.fields.wineryName'), r.winery_name || '—'],
    [t('adminMarketAnalyses.fields.contactName'), r.contact_name || '—'],
    [t('adminMarketAnalyses.fields.email'), r.email || '—'],
    [t('adminMarketAnalyses.fields.website'), r.website || '—'],
    [t('adminMarketAnalyses.fields.location'), r.winery_location || '—'],
    [t('adminMarketAnalyses.fields.wineTypes'), listLabels('wineTypes', r.wine_types)],
    [t('adminMarketAnalyses.fields.appellations'), r.appellations_cuvees || '—'],
    [t('adminMarketAnalyses.fields.priceRange'), r.export_price_range ? optionLabel('priceRanges', r.export_price_range) : '—'],
    [t('adminMarketAnalyses.fields.certifications'), listLabels('certifications', r.certifications)],
    [t('adminMarketAnalyses.fields.market'), marketLabel(r.target_country)],
    [t('adminMarketAnalyses.fields.importerPreferences'), listLabels('importerPreferences', r.importer_preferences)],
    [t('adminMarketAnalyses.fields.exclusions'), r.exclusions || '—'],
    [t('adminMarketAnalyses.fields.additionalContext'), r.additional_context || '—'],
    [t('adminMarketAnalyses.fields.source'), r.source || '—'],
    [t('adminMarketAnalyses.fields.campaign'), r.campaign || '—'],
    [t('adminMarketAnalyses.fields.referrer'), r.referrer || '—'],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('adminMarketAnalyses.title')}</h1>
        <p className="text-muted-foreground">{t('adminMarketAnalyses.subtitle')}</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-base">
            {t('adminMarketAnalyses.count', { count: filtered.length })}
          </CardTitle>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map(key => (
                <Button
                  key={key}
                  size="sm"
                  variant={filter === key ? 'default' : 'outline'}
                  onClick={() => setFilter(key)}
                >
                  {t(`adminMarketAnalyses.filters.${key}`)}
                </Button>
              ))}
            </div>
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('adminMarketAnalyses.searchPlaceholder')}
              className="md:w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">{t('adminMarketAnalyses.empty')}</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('adminMarketAnalyses.table.date')}</TableHead>
                      <TableHead>{t('adminMarketAnalyses.table.winery')}</TableHead>
                      <TableHead>{t('adminMarketAnalyses.table.contact')}</TableHead>
                      <TableHead>{t('adminMarketAnalyses.table.email')}</TableHead>
                      <TableHead>{t('adminMarketAnalyses.table.market')}</TableHead>
                      <TableHead>{t('adminMarketAnalyses.table.status')}</TableHead>
                      <TableHead className="text-right">{t('adminMarketAnalyses.table.importers')}</TableHead>
                      <TableHead className="text-right">{t('adminMarketAnalyses.table.avgScore')}</TableHead>
                      <TableHead>{t('adminMarketAnalyses.table.source')}</TableHead>
                      <TableHead className="text-right">{t('adminMarketAnalyses.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map(r => {
                      const avg = avgScore(r);
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="whitespace-nowrap">{formatDateLong(r.created_at)}</TableCell>
                          <TableCell className="font-medium">{r.winery_name || '—'}</TableCell>
                          <TableCell>{r.contact_name || '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{r.email || '—'}</TableCell>
                          <TableCell>{marketLabel(r.target_country)}</TableCell>
                          <TableCell>
                            <Badge variant={STATUS_VARIANTS[r.status] || 'secondary'}>
                              {t(`adminMarketAnalyses.status.${r.status}`, { defaultValue: r.status })}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {r.result_json ? shortlistOf(r).length : '—'}
                          </TableCell>
                          <TableCell className="text-right">{avg ?? '—'}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {[r.source, r.campaign].filter(Boolean).join(' · ') || '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => openDetail(r)}>
                              <Eye className="mr-1 h-4 w-4" />
                              {t('adminMarketAnalyses.view')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    {t('common.previous', { defaultValue: 'Précédent' })}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    {t('common.next', { defaultValue: 'Suivant' })}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!active} onOpenChange={open => !open && setActive(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {active && (
            <>
              <SheetHeader>
                <SheetTitle>{active.winery_name || t('adminMarketAnalyses.title')}</SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant={STATUS_VARIANTS[active.status] || 'secondary'}>
                    {t(`adminMarketAnalyses.status.${active.status}`, { defaultValue: active.status })}
                  </Badge>
                  <span>{formatDateLong(active.created_at)}</span>
                  {active.processed_at && (
                    <span>
                      {t('adminMarketAnalyses.detail.processedAt')} : {formatDateLong(active.processed_at)}
                    </span>
                  )}
                </div>

                {active.processing_error && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                    <p className="font-medium">{t('adminMarketAnalyses.detail.error')}</p>
                    <p className="mt-1 break-words text-muted-foreground">{active.processing_error}</p>
                  </div>
                )}

                <section>
                  <h3 className="mb-3 text-sm font-semibold">{t('adminMarketAnalyses.detail.formData')}</h3>
                  <dl className="space-y-2 text-sm">
                    {detailRows(active).map(([label, value]) => (
                      <div key={label} className="grid grid-cols-[minmax(0,10rem)_1fr] gap-3">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="break-words">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>

                {active.result_json?.market_summary && (
                  <section>
                    <h3 className="mb-2 text-sm font-semibold">{t('adminMarketAnalyses.detail.summary')}</h3>
                    <p className="whitespace-pre-line text-sm text-muted-foreground">
                      {active.result_json.market_summary}
                    </p>
                  </section>
                )}

                {!!active.result_json?.recommended_approach?.length && (
                  <section>
                    <h3 className="mb-2 text-sm font-semibold">{t('adminMarketAnalyses.detail.recommendations')}</h3>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {active.result_json.recommended_approach.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </section>
                )}

                {!!shortlistOf(active).length && (
                  <section>
                    <h3 className="mb-3 text-sm font-semibold">
                      {t('adminMarketAnalyses.detail.shortlist', { count: shortlistOf(active).length })}
                    </h3>
                    <div className="space-y-3">
                      {shortlistOf(active).map((item, i) => {
                        const contact = item.buyer_contact_id ? contacts[item.buyer_contact_id] : undefined;
                        return (
                          <div key={`${item.buyer_contact_id ?? i}`} className="rounded-md border p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium">{item.company_name || '—'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {[item.city, item.country].filter(Boolean).join(', ') || '—'}
                                </p>
                              </div>
                              <Badge variant="secondary">{item.score ?? '—'}/10</Badge>
                            </div>
                            {item.reason && (
                              <p className="mt-2 text-sm text-muted-foreground">{item.reason}</p>
                            )}
                            <div className="mt-2 space-y-1 text-sm">
                              {(item.website_url || contact?.website_url) && (
                                <a
                                  href={item.website_url || contact?.website_url || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-primary hover:underline"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  {item.website_url || contact?.website_url}
                                </a>
                              )}
                              {contact?.email && (
                                <p className="flex items-center gap-1">
                                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                  <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a>
                                </p>
                              )}
                              {contact?.phone && (
                                <p className="flex items-center gap-1">
                                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                  {contact.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {active.result_json && (
                  <section>
                    <Button size="sm" variant="ghost" onClick={() => setShowRaw(v => !v)}>
                      {showRaw
                        ? t('adminMarketAnalyses.detail.hideRaw')
                        : t('adminMarketAnalyses.detail.showRaw')}
                    </Button>
                    {showRaw && (
                      <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">
                        {JSON.stringify(active.result_json, null, 2)}
                      </pre>
                    )}
                  </section>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
