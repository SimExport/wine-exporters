import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, Mail, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  const shortlist = useMemo(() => resultJson?.shortlist ?? [], [resultJson]);

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