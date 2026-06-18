import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Trash2, PlayCircle, FileSearch, Eye } from 'lucide-react';
import { COUNTRIES as COUNTRY_LIST } from '@/components/importers/CountrySelector';
import { SourcingResultsDialog } from '@/components/sourcing/SourcingResultsDialog';
import { formatDateLong } from '@/lib/format';

interface SourcingRequest {
  id: string;
  user_id: string;
  target_market: string;
  status: 'pending' | 'in_progress' | 'validated' | 'archived';
  admin_note: string | null;
  result_file_url: string | null;
  result_file_name: string | null;
  result_file_size: number | null;
  result_file_format: string | null;
  validated_at: string | null;
  archived_at: string | null;
  created_at: string;
  display_name?: string | null;
  domain_name?: string | null;
  result_json?: any | null;
  result_summary?: string | null;
  states_filter?: string[] | null;
}

interface SourcingRequestWithError extends SourcingRequest {
  error_message?: string | null;
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  pending: 'secondary',
  in_progress: 'outline',
  validated: 'default',
  archived: 'secondary',
};

export default function AdminSourcing() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [requests, setRequests] = useState<SourcingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<'24h' | '7d' | '30d' | '90d' | 'all'>('7d');

  const [activeRequest, setActiveRequest] = useState<SourcingRequest | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sourcing_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      setRequests([]);
      setLoading(false);
      return;
    }
    const rows = (data as any[]) || [];
    const userIds = Array.from(new Set(rows.map(r => r.user_id)));
    let settingsMap: Record<string, string | null> = {};
    let domainMap: Record<string, string | null> = {};
    if (userIds.length) {
      const [{ data: settings }, { data: profiles }] = await Promise.all([
        supabase.from('user_settings').select('user_id, display_name').in('user_id', userIds),
        supabase.from('profiles').select('user_id, domain_name').in('user_id', userIds),
      ]);
      settingsMap = Object.fromEntries((settings || []).map((s: any) => [s.user_id, s.display_name]));
      domainMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.domain_name]));
    }
    setRequests(rows.map(r => ({
      ...r,
      display_name: settingsMap[r.user_id] ?? null,
      domain_name: domainMap[r.user_id] ?? null,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const filtered = useMemo(() => {
    if (periodFilter === 'all') return requests;
    const hours = periodFilter === '24h' ? 24 : periodFilter === '7d' ? 24 * 7 : periodFilter === '30d' ? 24 * 30 : 24 * 90;
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return requests.filter(r => new Date(r.created_at).getTime() >= cutoff);
  }, [requests, periodFilter]);

  const marketLabel = (code: string) => COUNTRY_LIST.find(c => c.code === code)?.name || code;

  const startProcessing = async (req: SourcingRequest) => {
    setProcessingId(req.id);
    toast({ title: t('adminSourcing.toast.processingStarted') });
    try {
      const { data, error } = await supabase.functions.invoke('process-sourcing-request', {
        body: { sourcing_request_id: req.id, force: true },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: t('adminSourcing.toast.processingDone') });
    } catch (e: any) {
      console.error(e);
      toast({ title: t('common.error'), description: e.message || t('adminSourcing.toast.processingError'), variant: 'destructive' });
    } finally {
      setProcessingId(null);
      fetchRequests();
    }
  };

  const handleDelete = async () => {
    if (!activeRequest) return;
    if (activeRequest.result_file_url) {
      await supabase.storage.from('sourcing-results').remove([activeRequest.result_file_url]);
    }
    const { error } = await supabase.from('sourcing_requests').delete().eq('id', activeRequest.id);
    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
      return;
    }
    setDeleteOpen(false);
    fetchRequests();
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">{t('adminSourcing.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('adminSourcing.subtitle')}</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{t('adminSourcing.requests')}</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as typeof periodFilter)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">{t('adminSourcing.filter.period.24h')}</SelectItem>
                <SelectItem value="7d">{t('adminSourcing.filter.period.7d')}</SelectItem>
                <SelectItem value="30d">{t('adminSourcing.filter.period.30d')}</SelectItem>
                <SelectItem value="90d">{t('adminSourcing.filter.period.90d')}</SelectItem>
                <SelectItem value="all">{t('adminSourcing.filter.period.all')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileSearch className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">{t('adminSourcing.empty')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('adminSourcing.col.client')}</TableHead>
                  <TableHead>{t('adminSourcing.col.market')}</TableHead>
                  <TableHead>{t('adminSourcing.col.status')}</TableHead>
                  <TableHead>{t('adminSourcing.col.date')}</TableHead>
                  <TableHead className="text-right">{t('adminSourcing.col.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(req => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">
                      {req.domain_name || req.display_name || req.user_id.slice(0, 8) + '…'}
                    </TableCell>
                    <TableCell>{marketLabel(req.target_market)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[req.status]}>{t(`sourcing.status.${req.status}`)}</Badge>
                      {(req as any).error_message && req.status === 'pending' && (
                        <div className="mt-1 text-xs text-destructive max-w-[220px] truncate" title={(req as any).error_message}>
                          {(req as any).error_message}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateLong(req.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 flex-wrap">
                        {req.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startProcessing(req)}
                            disabled={processingId === req.id}
                          >
                            {processingId === req.id
                              ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              : <PlayCircle className="h-4 w-4 mr-1" />}
                            {t('adminSourcing.action.start')}
                          </Button>
                        )}
                        {req.status === 'in_progress' && (
                          <Badge variant="outline" className="gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            {t('sourcing.processing.label')}
                          </Badge>
                        )}
                        {req.status === 'validated' && req.result_json && (
                          <Button size="sm" onClick={() => { setActiveRequest(req); setResultsOpen(true); }}>
                            <Eye className="h-4 w-4 mr-1" />{t('adminSourcing.action.viewResults')}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => { setActiveRequest(req); setDeleteOpen(true); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('adminSourcing.deleteConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('adminSourcing.deleteConfirm.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SourcingResultsDialog
        open={resultsOpen}
        onOpenChange={setResultsOpen}
        summary={activeRequest?.result_summary ?? null}
        resultJson={activeRequest?.result_json ?? null}
        marketLabel={activeRequest ? marketLabel(activeRequest.target_market) : ''}
        requestId={activeRequest?.id ?? null}
      />
    </div>
  );
}