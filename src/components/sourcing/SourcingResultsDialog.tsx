import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { addSourcingProspects, sourcingSelectionIndices, formatSourcingSummary, buyerContactId, buildSourcingLead, channelsOf, EXPORT_HEADERS, exportRow, hasConfirmedDirectImport, portfolioOf, primaryPerson, reasonOf, safeWebsiteUrl, scoreOf, text, toCsv, toProfileContact, websiteOf, type SourcingContactRow, type SourcingShortlistItem } from '@/lib/sourcing-results';
import { ImporterProfileSheet } from '@/components/importers/ImporterProfileSheet';
import { Download, ExternalLink, Mail, Phone, UserPlus, Check, ChevronDown, ChevronLeft, ChevronRight, UsersRound, Loader2, FileText, Eye, User } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getOrCreateManualCampaign } from '@/lib/manual-campaign';

type ShortlistItem = SourcingShortlistItem;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  summary: string | null;
  resultJson: { shortlist?: ShortlistItem[] } | null;
  marketLabel: string;
  requestId?: string | null;
}

export function SourcingResultsDialog({ open, onOpenChange, summary, resultJson, marketLabel, requestId }: Props) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [addedIdx, setAddedIdx] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);
  const busy = useRef(false);
  const [selectedIdx, setSelectedIdx] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0);
  const [profileIdx, setProfileIdx] = useState<number | null>(null);
  const shortlist = useMemo(() => resultJson?.shortlist ?? [], [resultJson]);

  useEffect(() => {
    setAddedIdx(new Set());
    setSelectedIdx(new Set());
    setPage(0);
    setProfileIdx(null);
  }, [requestId, resultJson, user?.id]);

  const available = sourcingSelectionIndices(shortlist.length, addedIdx);
  const selected = sourcingSelectionIndices(shortlist.length, addedIdx, selectedIdx);
  const pageCount = Math.max(1, Math.ceil(shortlist.length / 10));
  const visible = shortlist.slice(page * 10, page * 10 + 10);
  const toggleSelection = (index: number, checked: boolean) => {
    setSelectedIdx(previous => {
      const next = new Set(previous);
      if (checked) next.add(index); else next.delete(index);
      return next;
    });
  };

  const addToCrm = async (item: ShortlistItem, campaignId: string) => {
    if (!user) throw new Error(t('common.error'));
    const contactId = buyerContactId(item);
    const email = text(item.email);
    const duplicateQuery = supabase.from('leads').select('id').eq('campaign_id', campaignId);
    const { data: existing, error: duplicateError } = await (contactId
      ? duplicateQuery.eq('buyer_contact_id', contactId)
      : email ? duplicateQuery.eq('email', email) : duplicateQuery.eq('buyer_id', item.company_name)).limit(1);
    if (duplicateError) throw duplicateError;
    if (existing?.length) return 'existing' as const;
    const contactCols = 'street, city, postal_code, country, phone, website_url, email, state, full_address, Address';
    let contact: SourcingContactRow | null = null;
    if (contactId) {
      // Same buyer_contacts row only: no ambiguous name/email lookup.
      const { data } = await supabase.from('buyer_contacts').select(contactCols).eq('id', contactId).maybeSingle();
      contact = (data as SourcingContactRow | null) ?? null;
    } else {
      if (email) {
        const { data } = await supabase.from('buyer_contacts').select(contactCols).eq('email', email).maybeSingle();
        contact = (data as SourcingContactRow | null) ?? null;
      }
      if (!contact && item.company_name) {
        const { data } = await supabase.from('buyer_contacts').select(contactCols).eq('company_name', item.company_name).limit(1).maybeSingle();
        contact = (data as SourcingContactRow | null) ?? null;
      }
    }
    const lead = buildSourcingLead({ item, contact, campaignId, marketLabel, requestId: requestId ?? null, userId: user.id, now: new Date().toISOString() });
    const { error } = await supabase.from('leads').insert(lead as any);
    if (error) throw error;
    return 'added' as const;
  };

  const addMultiple = async (indices: number[]) => {
    if (!user || busy.current || !indices.length) return;
    busy.current = true;
    setAdding(true);
    try {
      const campaignId = await getOrCreateManualCampaign(user.id);
      const result = await addSourcingProspects(indices, async index => {
        const item = shortlist[index];
        if (!item) throw new Error('Missing prospect');
        const outcome = await addToCrm(item, campaignId);
        setAddedIdx(previous => new Set(previous).add(index));
        toggleSelection(index, false);
        return outcome;
      });
      toast({
        title: t('sourcing.results.bulkComplete'),
        description: t('sourcing.results.bulkResult', { added: result.added, existing: result.existing, failed: result.failed.length }),
        variant: result.failed.length ? 'destructive' : 'default',
      });
    } catch {
      toast({ title: t('common.error'), description: t('sourcing.results.addError'), variant: 'destructive' });
    } finally {
      busy.current = false;
      setAdding(false);
    }
  };

  const exportAoa = () => [
    [...EXPORT_HEADERS] as string[],
    ...shortlist.map(r => exportRow(r, i18n.language, t('sourcing.results.directImport'))),
  ];

  const exportXlsx = () => {
    const aoa = exportAoa();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = aoa[0].map((h, i) => ({
      wch: Math.min(60, Math.max(h.length + 2, ...aoa.slice(1).map(row => String(row[i] ?? '').length + 2))),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Shortlist');
    XLSX.writeFile(wb, `shortlist-${marketLabel}.xlsx`);
  };

  const exportCsv = () => {
    const delimiter = ';';
    const content = `sep=${delimiter}\r\n` + toCsv(exportAoa(), delimiter);
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shortlist-${marketLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const profileContact = profileIdx === null ? null : toProfileContact(shortlist[profileIdx] ?? { company_name: '' }, marketLabel);
  const scoreBadge = (r: ShortlistItem) => {
    const score = scoreOf(r);
    if (score === null) return null;
    return <Badge variant={score >= 8 ? 'default' : score >= 5 ? 'secondary' : 'outline'}>{score}/10</Badge>;
  };
  const actions = (r: ShortlistItem, i: number) => (
    <div className="flex flex-wrap gap-2">
      {buyerContactId(r) && <Button size="sm" variant="ghost" onClick={() => setProfileIdx(i)}><Eye className="h-3 w-3 mr-1" />{t('sourcing.results.viewProfile')}</Button>}
      {addedIdx.has(i) ? (
        <Badge variant="secondary" className="gap-1"><Check className="h-3 w-3" />{t('sourcing.results.added')}</Badge>
      ) : (
        <Button size="sm" variant="outline" disabled={adding || !user} onClick={() => addMultiple([i])}>
          <UserPlus className="h-3 w-3 mr-1" />{t('sourcing.results.addToCrm')}
        </Button>
      )}
    </div>
  );
  const contactBlock = (r: ShortlistItem) => {
    const p = primaryPerson(r);
    const email = p?.business_email || text(r.email);
    const site = safeWebsiteUrl(websiteOf(r));
    const phone = text(r.phone);
    return (
      <div className="flex min-w-0 flex-col gap-1 text-xs">
        {p?.full_name && <span className="flex items-center gap-1 font-medium text-foreground"><User className="h-3 w-3 shrink-0" /><span className="truncate">{p.full_name}</span></span>}
        {p?.job_title && <span className="truncate text-muted-foreground">{p.job_title}</span>}
        {email && <a href={`mailto:${email}`} className="flex items-center gap-1 text-primary hover:underline"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{email}</span></a>}
        <span className="flex items-center gap-3">
          {phone && <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} aria-label={phone} title={phone} className="text-muted-foreground hover:text-primary"><Phone className="h-3.5 w-3.5" /></a>}
          {site && <a href={site} target="_blank" rel="noopener noreferrer" aria-label={t('sourcing.results.website')} title={site} className="text-muted-foreground hover:text-primary"><ExternalLink className="h-3.5 w-3.5" /></a>}
        </span>
      </div>
    );
  };
  const companyBlock = (r: ShortlistItem) => (
    <div className="min-w-0">
      <p className="font-medium text-foreground line-clamp-2">{r.company_name}</p>
      {(text(r.city) || text(r.company_type)) && <p className="text-xs text-muted-foreground truncate">{[text(r.city), text(r.company_type)].filter(Boolean).join(' · ')}</p>}
    </div>
  );
  const tags = (values: string[], extra?: string) => values.length || extra ? (
    <div className="flex flex-wrap gap-1">
      {values.map(v => <Badge key={v} variant="outline" className="max-w-[10rem] truncate font-normal">{v}</Badge>)}
      {extra && <Badge variant="secondary" className="font-normal">{extra}</Badge>}
    </div>
  ) : <span className="text-xs text-muted-foreground">—</span>;
  const directLabel = (r: ShortlistItem) => hasConfirmedDirectImport(r) ? t('sourcing.results.directImport') : undefined;

  return (
    <Dialog open={open} onOpenChange={value => { if (!busy.current) onOpenChange(value); }}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('sourcing.results.title', { market: marketLabel })}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="contacts" className="flex-1 overflow-hidden flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="contacts">
                {t('sourcing.results.contactsTab')} ({shortlist.length})
              </TabsTrigger>
              <TabsTrigger value="summary">{t('sourcing.results.summaryTab')}</TabsTrigger>
            </TabsList>
            <div className="flex items-center">
              <Button
                variant="outline"
                size="sm"
                className="rounded-r-none"
                onClick={exportXlsx}
                disabled={!shortlist.length}
              >
                <Download className="h-4 w-4 mr-2" />
                {t('sourcing.results.exportCsv')}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-l-none border-l-0 px-2"
                    disabled={!shortlist.length}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportXlsx}>
                    {t('importers.exportCredits.formatXlsx')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportCsv}>
                    {t('importers.exportCredits.formatCsv')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <TabsContent value="contacts" className="flex-1 min-h-0 overflow-hidden flex flex-col data-[state=inactive]:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 mb-3">
              <div className="flex items-center gap-2 text-sm">
                <Checkbox
                  id="select-all-sourcing"
                  aria-label={t('sourcing.results.selectAll')}
                  checked={available.length > 0 && selected.length === available.length ? true : selected.length ? 'indeterminate' : false}
                  disabled={adding || !available.length}
                  onCheckedChange={checked => setSelectedIdx(checked === true ? new Set(available) : new Set())}
                />
                <label htmlFor="select-all-sourcing" className="cursor-pointer">{t('sourcing.results.selectAll')}</label>
                {selected.length > 0 && <Badge variant="secondary">{t('sourcing.results.selected', { count: selected.length })}</Badge>}
              </div>
              <div className="flex flex-wrap gap-2">
                {selected.length > 0 && <Button size="sm" variant="outline" disabled={adding || !user} onClick={() => addMultiple(selected)}>
                  <UserPlus className="h-4 w-4 mr-2" />{t('sourcing.results.addSelected', { count: selected.length })}
                </Button>}
                <Button size="sm" disabled={adding || !available.length || !user} onClick={() => addMultiple(available)}>
                  {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UsersRound className="h-4 w-4 mr-2" />}
                  {adding ? t('sourcing.results.adding') : t('sourcing.results.addAll', { count: available.length })}
                </Button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
            <ul className="space-y-3 md:hidden">
              {visible.map((r, offset) => {
                const i = page * 10 + offset;
                return (
                  <li key={i} className="rounded-lg border bg-card p-3 space-y-3">
                    <div className="flex items-start gap-3">
                      <Checkbox className="mt-1" aria-label={t('sourcing.results.selectProspect', { name: r.company_name })} checked={selectedIdx.has(i)} disabled={adding || addedIdx.has(i)} onCheckedChange={checked => toggleSelection(i, checked === true)} />
                      <div className="flex-1 min-w-0">{companyBlock(r)}</div>
                      {scoreBadge(r)}
                    </div>
                    {reasonOf(r) && <p className="text-sm text-muted-foreground line-clamp-3">{reasonOf(r)}</p>}
                    {portfolioOf(r).length > 0 && tags(portfolioOf(r))}
                    {(channelsOf(r).length > 0 || directLabel(r)) && tags(channelsOf(r), directLabel(r))}
                    {contactBlock(r)}
                    {actions(r, i)}
                  </li>
                );
              })}
            </ul>
            <Table className="hidden md:table min-w-[1500px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><span className="sr-only">{t('sourcing.results.selectAll')}</span></TableHead>
                  <TableHead className="w-[170px]">{t('sourcing.results.col.company')}</TableHead>
                  <TableHead className="w-[150px]">{t('sourcing.results.col.portfolio')}</TableHead>
                  <TableHead className="w-[140px]">{t('sourcing.results.col.distribution')}</TableHead>
                  <TableHead className="w-[150px]">{t('sourcing.results.col.decisionMaker')}</TableHead>
                  <TableHead className="w-[190px]">{t('sourcing.results.col.email')}</TableHead>
                  <TableHead className="w-[130px]">{t('sourcing.results.col.phone')}</TableHead>
                  <TableHead className="w-[160px]">{t('sourcing.results.col.website')}</TableHead>
                  <TableHead className="w-[80px]">{t('sourcing.results.col.score')}</TableHead>
                  <TableHead className="min-w-[280px]">{t('sourcing.results.col.justification')}</TableHead>
                  <TableHead className="w-36">{t('sourcing.results.col.action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r, offset) => {
                  const i = page * 10 + offset;
                  const p = primaryPerson(r);
                  const email = p?.business_email || text(r.email);
                  const phone = text(r.phone);
                  const rawSite = websiteOf(r);
                  const site = safeWebsiteUrl(rawSite);
                  const dash = <span className="text-xs text-muted-foreground">—</span>;
                  return (
                  <TableRow key={i} data-state={selectedIdx.has(i) ? 'selected' : undefined} className="align-top">
                    <TableCell><Checkbox aria-label={t('sourcing.results.selectProspect', { name: r.company_name })} checked={selectedIdx.has(i)} disabled={adding || addedIdx.has(i)} onCheckedChange={checked => toggleSelection(i, checked === true)} /></TableCell>
                    <TableCell>{companyBlock(r)}</TableCell>
                    <TableCell>{tags(portfolioOf(r))}</TableCell>
                    <TableCell>{tags(channelsOf(r), directLabel(r))}</TableCell>
                    <TableCell className="text-xs">
                      {p?.full_name || p?.job_title ? (
                        <div className="space-y-0.5">
                          {p?.full_name && <p className="font-medium text-foreground">{p.full_name}</p>}
                          {p?.job_title && <p className="text-muted-foreground">{p.job_title}</p>}
                        </div>
                      ) : dash}
                    </TableCell>
                    <TableCell className="text-xs">
                      {email ? <a href={`mailto:${email}`} className="text-primary hover:underline break-all">{email}</a> : dash}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {phone ? <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} className="hover:text-primary">{phone}</a> : dash}
                    </TableCell>
                    <TableCell className="text-xs">
                      {site ? <a href={site} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{(rawSite || site).replace(/^https?:\/\//i, '').replace(/\/$/, '')}</a> : dash}
                    </TableCell>
                    <TableCell>{scoreBadge(r)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-pre-line">{reasonOf(r) || dash}</TableCell>
                    <TableCell>{actions(r, i)}</TableCell>
                  </TableRow>
                ); })}
              </TableBody>
            </Table>
            </div>
            <div className="flex items-center justify-between border-t pt-3 mt-3 gap-2">
              <p className="text-xs text-muted-foreground">{t('sourcing.results.page', { current: page + 1, total: pageCount })}</p>
              <div className="flex gap-1">
                <Button size="icon" variant="outline" disabled={page === 0} aria-label={t('sourcing.results.previous')} onClick={() => setPage(value => value - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button size="icon" variant="outline" disabled={page + 1 >= pageCount} aria-label={t('sourcing.results.next')} onClick={() => setPage(value => value + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="summary" className="flex-1 overflow-auto">
            <section className="px-1 py-3 sm:px-4">
              <header className="flex items-start gap-3 border-b pb-5 mb-6">
                <FileText className="h-6 w-6 text-primary shrink-0 mt-1" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{t('sourcing.results.summaryTab')}</p>
                  <h2 className="text-xl font-semibold text-foreground">{t('sourcing.results.summaryTitle', { market: marketLabel })}</h2>
                </div>
              </header>
              {summary ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                h1: ({ children }) => <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">{children}</h3>,
                h2: ({ children }) => <h3 className="text-base font-semibold text-primary border-l-2 border-primary pl-3 mt-7 mb-3">{children}</h3>,
                h3: ({ children }) => <h4 className="text-base font-semibold text-foreground mt-6 mb-3">{children}</h4>,
                p: ({ children }) => <p className="text-sm leading-7 text-foreground mb-5 break-words">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 space-y-2 mb-5 text-sm leading-7">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 space-y-2 mb-5 text-sm leading-7">{children}</ol>,
                a: ({ children, href }) => <a href={href} className="text-primary underline break-all" target="_blank" rel="noreferrer">{children}</a>,
              }}>{formatSourcingSummary(summary)}</ReactMarkdown> : <p className="text-sm text-muted-foreground">{t('sourcing.results.emptySummary')}</p>}
            </section>
          </TabsContent>
        </Tabs>
      </DialogContent>
      <ImporterProfileSheet
        contact={profileContact}
        onClose={() => setProfileIdx(null)}
        crmAction={profileIdx === null ? undefined : {
          state: addedIdx.has(profileIdx) ? 'added' : adding ? 'adding' : 'idle',
          onAdd: () => addMultiple([profileIdx]),
        }}
      />
    </Dialog>
  );
}