import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { addSourcingProspects, sourcingSelectionIndices, formatSourcingSummary } from '@/lib/sourcing-results';
import { Download, ExternalLink, Mail, Phone, UserPlus, Check, ChevronDown, ChevronLeft, ChevronRight, UsersRound, Loader2, FileText } from 'lucide-react';
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

interface ShortlistItem {
  company_name: string;
  email?: string | null;
  phone?: string | null;
  website_url?: string | null;
  score: number;
  reason: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  summary: string | null;
  resultJson: { shortlist?: ShortlistItem[] } | null;
  marketLabel: string;
  requestId?: string | null;
}

export function SourcingResultsDialog({ open, onOpenChange, summary, resultJson, marketLabel, requestId }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [addedIdx, setAddedIdx] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);
  const busy = useRef(false);
  const [selectedIdx, setSelectedIdx] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0);
  const shortlist = useMemo(() => resultJson?.shortlist ?? [], [resultJson]);

  useEffect(() => {
    setAddedIdx(new Set());
    setSelectedIdx(new Set());
    setPage(0);
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
    const identity = item.email || item.company_name;
    const duplicateQuery = supabase.from('leads').select('id').eq('campaign_id', campaignId);
    const { data: existing, error: duplicateError } = await (item.email
      ? duplicateQuery.eq('email', item.email)
      : duplicateQuery.eq('buyer_id', identity)).limit(1);
    if (duplicateError) throw duplicateError;
    if (existing?.length) return 'existing' as const;
      // Enrich from buyer_contacts (address fields not present in LLM shortlist)
      let contact: {
        street: string | null;
        city: string | null;
        postal_code: string | null;
        country: string | null;
        phone: string | null;
        website_url: string | null;
        email: string | null;
        state: string | null;
        full_address: string | null;
        Address: string | null;
      } | null = null;
      const contactCols = 'street, city, postal_code, country, phone, website_url, email, state, full_address, Address';
      if (item.email) {
        const { data } = await supabase
          .from('buyer_contacts')
          .select(contactCols)
          .eq('email', item.email)
          .maybeSingle();
        contact = (data as any) ?? null;
      }
      if (!contact && item.company_name) {
        const { data } = await supabase
          .from('buyer_contacts')
          .select(contactCols)
          .eq('company_name', item.company_name)
          .limit(1)
          .maybeSingle();
        contact = (data as any) ?? null;
      }
      // Fallback street from full_address / Address (first segment before the comma)
      let street = contact?.street || null;
      if (!street) {
        const raw = contact?.full_address || contact?.Address || null;
        if (raw) {
          const first = raw.split(',')[0]?.trim();
          if (first && !/^\d{4,}$/.test(first) && first.toLowerCase() !== (contact?.city || '').toLowerCase()) {
            street = first;
          }
        }
      }
      const { error } = await supabase.from('leads').insert({
        campaign_id: campaignId,
        company_name: item.company_name,
        first_name: null,
        last_name: null,
        email: item.email || contact?.email || null,
        phone: item.phone || contact?.phone || null,
        website_url: item.website_url || contact?.website_url || null,
        address_line1: street,
        address_line2: contact?.state || null,
        city: contact?.city || null,
        postal_code: contact?.postal_code || null,
        country: contact?.country || marketLabel || null,
        buyer_id: item.email || item.company_name,
        market: marketLabel,
        message_snippet: item.reason,
        owner_notes: 'Issu de Recherche sur-mesure',
        prospect_status: 'new' as any,
        last_activity_at: new Date().toISOString(),
        created_by: user.id,
        source: 'sourcing',
        source_ref: requestId ?? null,
        source_score: typeof item.score === 'number' ? item.score : null,
        source_relevance: item.reason ?? null,
      });
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

  const headers = ['company_name', 'email', 'phone', 'website_url', 'score', 'reason'];

  const exportXlsx = () => {
    const aoa = [
      headers,
      ...shortlist.map(r => headers.map(h => (r as any)[h] ?? '')),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = headers.map((h, i) => ({
      wch: Math.min(60, Math.max(h.length + 2, ...aoa.slice(1).map(row => String(row[i] ?? '').length + 2))),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Shortlist');
    XLSX.writeFile(wb, `shortlist-${marketLabel}.xlsx`);
  };

  const exportCsv = () => {
    const delimiter = ';';
    const lines = [headers.join(delimiter)];
    for (const r of shortlist) {
      const row = headers.map(h => {
        const v = (r as any)[h] ?? '';
        const s = String(v).replace(/"/g, '""');
        return `"${s}"`;
      });
      lines.push(row.join(delimiter));
    }
    const content = `sep=${delimiter}\r\n` + lines.join('\r\n');
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shortlist-${marketLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={value => { if (!busy.current) onOpenChange(value); }}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><span className="sr-only">{t('sourcing.results.selectAll')}</span></TableHead>
                  <TableHead>{t('sourcing.results.col.company')}</TableHead>
                  <TableHead>{t('sourcing.results.col.contact')}</TableHead>
                  <TableHead className="w-20">{t('sourcing.results.score')}</TableHead>
                  <TableHead>{t('sourcing.results.col.reason')}</TableHead>
                  <TableHead className="w-40">{t('sourcing.results.col.action', { defaultValue: 'Action' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r, offset) => {
                  const i = page * 10 + offset;
                  return (
                  <TableRow key={i} data-state={selectedIdx.has(i) ? 'selected' : undefined}>
                    <TableCell><Checkbox aria-label={t('sourcing.results.selectProspect', { name: r.company_name })} checked={selectedIdx.has(i)} disabled={adding || addedIdx.has(i)} onCheckedChange={checked => toggleSelection(i, checked === true)} /></TableCell>
                    <TableCell className="font-medium">{r.company_name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs">
                        {r.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{r.email}</span>}
                        {r.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{r.phone}</span>}
                        {r.website_url && <a href={r.website_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline"><ExternalLink className="h-3 w-3" />{r.website_url}</a>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.score >= 8 ? 'default' : r.score >= 5 ? 'secondary' : 'outline'}>
                        {r.score}/10
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.reason}</TableCell>
                    <TableCell>
                      {addedIdx.has(i) ? (
                        <Badge variant="secondary" className="gap-1"><Check className="h-3 w-3" />{t('sourcing.results.added', { defaultValue: 'Ajouté' })}</Badge>
                      ) : (
                        <Button size="sm" variant="outline" disabled={adding || !user} onClick={() => addMultiple([i])}>
                          <UserPlus className="h-3 w-3 mr-1" />
                          {t('sourcing.results.addToCrm', { defaultValue: 'Ajouter au CRM' })}
                        </Button>
                      )}
                    </TableCell>
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
    </Dialog>
  );
}