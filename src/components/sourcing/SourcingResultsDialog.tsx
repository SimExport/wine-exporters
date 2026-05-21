import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, Mail, Phone, UserPlus, Check } from 'lucide-react';
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
}

export function SourcingResultsDialog({ open, onOpenChange, summary, resultJson, marketLabel }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [addedIdx, setAddedIdx] = useState<Set<number>>(new Set());
  const [addingIdx, setAddingIdx] = useState<number | null>(null);
  const shortlist = useMemo(() => resultJson?.shortlist ?? [], [resultJson]);

  const addToCrm = async (item: ShortlistItem, idx: number) => {
    if (!user) return;
    setAddingIdx(idx);
    try {
      const campaignId = await getOrCreateManualCampaign(user.id);
      // Skip dup by email when available
      if (item.email) {
        const { data: existing } = await supabase
          .from('leads').select('id')
          .eq('campaign_id', campaignId).eq('email', item.email).maybeSingle();
        if (existing) {
          setAddedIdx(prev => new Set(prev).add(idx));
          toast({ title: t('sourcing.results.alreadyInCrm', { defaultValue: 'Déjà dans le CRM' }) });
          return;
        }
      }
      const { error } = await supabase.from('leads').insert({
        campaign_id: campaignId,
        company_name: item.company_name,
        email: item.email || null,
        phone: item.phone || null,
        website_url: item.website_url || null,
        buyer_id: item.email || item.company_name,
        market: marketLabel,
        message_snippet: item.reason,
        owner_notes: 'Issu de Recherche sur-mesure',
        prospect_status: 'new' as any,
        last_activity_at: new Date().toISOString(),
        created_by: user.id,
      });
      if (error) throw error;
      setAddedIdx(prev => new Set(prev).add(idx));
      toast({
        title: t('sourcing.results.addedToCrm', { defaultValue: 'Ajouté au CRM' }),
      });
    } catch (e: any) {
      console.error(e);
      toast({
        title: t('common.error'),
        description: e?.message,
        variant: 'destructive',
      });
    } finally {
      setAddingIdx(null);
    }
  };

  const exportCsv = () => {
    const headers = ['company_name', 'email', 'phone', 'website_url', 'score', 'reason'];
    const lines = [headers.join(',')];
    for (const r of shortlist) {
      const row = headers.map(h => {
        const v = (r as any)[h] ?? '';
        const s = String(v).replace(/"/g, '""');
        return `"${s}"`;
      });
      lines.push(row.join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shortlist-${marketLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('sourcing.results.title', { market: marketLabel })}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="contacts" className="flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="contacts">
                {t('sourcing.results.contactsTab')} ({shortlist.length})
              </TabsTrigger>
              <TabsTrigger value="summary">{t('sourcing.results.summaryTab')}</TabsTrigger>
            </TabsList>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!shortlist.length}>
              <Download className="h-4 w-4 mr-2" />
              {t('sourcing.results.exportCsv')}
            </Button>
          </div>
          <TabsContent value="contacts" className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('sourcing.results.col.company')}</TableHead>
                  <TableHead>{t('sourcing.results.col.contact')}</TableHead>
                  <TableHead className="w-20">{t('sourcing.results.score')}</TableHead>
                  <TableHead>{t('sourcing.results.col.reason')}</TableHead>
                  <TableHead className="w-40">{t('sourcing.results.col.action', { defaultValue: 'Action' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shortlist.map((r, i) => (
                  <TableRow key={i}>
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
                        <Button size="sm" variant="outline" disabled={addingIdx === i} onClick={() => addToCrm(r, i)}>
                          <UserPlus className="h-3 w-3 mr-1" />
                          {t('sourcing.results.addToCrm', { defaultValue: 'Ajouter au CRM' })}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
          <TabsContent value="summary" className="flex-1 overflow-auto">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary || ''}</ReactMarkdown>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}