import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, CheckCircle2, Archive, Trash2, Upload, Download, PlayCircle, RotateCcw, FileSearch, Eye } from 'lucide-react';
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
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  const [validateOpen, setValidateOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState<SourcingRequest | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    if (statusFilter === 'all') return requests;
    return requests.filter(r => r.status === statusFilter);
  }, [requests, statusFilter]);

  const marketLabel = (code: string) => COUNTRY_LIST.find(c => c.code === code)?.name || code;

  const openValidate = (req: SourcingRequest) => {
    setActiveRequest(req);
    setUploadFile(null);
    setAdminNote(req.admin_note || '');
    setValidateOpen(true);
  };

  const handleValidate = async () => {
    if (!activeRequest || !uploadFile) return;
    setSubmitting(true);
    try {
      const ext = uploadFile.name.split('.').pop()?.toLowerCase() || 'pdf';
      if (!['pdf', 'docx', 'doc', 'xlsx', 'csv'].includes(ext)) {
        toast({ title: t('common.error'), description: t('adminSourcing.invalidFormat'), variant: 'destructive' });
        setSubmitting(false);
        return;
      }
      const path = `${activeRequest.user_id}/${activeRequest.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('sourcing-results')
        .upload(path, uploadFile, { upsert: true, contentType: uploadFile.type });
      if (upErr) throw upErr;

      const { error: updErr } = await supabase
        .from('sourcing_requests')
        .update({
          status: 'validated',
          result_file_url: path,
          result_file_name: uploadFile.name,
          result_file_size: uploadFile.size,
          result_file_format: ext,
          admin_note: adminNote || null,
          validated_at: new Date().toISOString(),
        })
        .eq('id', activeRequest.id);
      if (updErr) throw updErr;

      try {
        await supabase.functions.invoke('notify-sourcing-validated', {
          body: { requestId: activeRequest.id },
        });
      } catch (e) { console.error(e); }

      toast({ title: t('adminSourcing.validatedTitle'), description: t('adminSourcing.validatedDesc') });
      setValidateOpen(false);
      fetchRequests();
    } catch (e: any) {
      console.error(e);
      toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (req: SourcingRequest, status: SourcingRequest['status']) => {
    const patch: any = { status };
    if (status === 'archived') patch.archived_at = new Date().toISOString();
    if (status !== 'archived') patch.archived_at = null;
    const { error } = await supabase.from('sourcing_requests').update(patch).eq('id', req.id);
    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
      return;
    }
    fetchRequests();
  };

  const startProcessing = async (req: SourcingRequest) => {
    setProcessingId(req.id);
    toast({ title: t('adminSourcing.toast.processingStarted') });
    try {
      const { data, error } = await supabase.functions.invoke('process-sourcing-request', {
        body: { sourcing_request_id: req.id },
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

  const downloadFile = async (req: SourcingRequest) => {
    if (!req.result_file_url) return;
    const { data, error } = await supabase.storage.from('sourcing-results').createSignedUrl(req.result_file_url, 600);
    if (error || !data?.signedUrl) {
      toast({ title: t('common.error'), description: error?.message || 'download error', variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank');
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('adminSourcing.filter.all')}</SelectItem>
                <SelectItem value="pending">{t('sourcing.status.pending')}</SelectItem>
                <SelectItem value="in_progress">{t('sourcing.status.in_progress')}</SelectItem>
                <SelectItem value="validated">{t('sourcing.status.validated')}</SelectItem>
                <SelectItem value="archived">{t('sourcing.status.archived')}</SelectItem>
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
                        {req.status !== 'validated' && req.status !== 'archived' && (
                          <Button size="sm" onClick={() => openValidate(req)}>
                            <CheckCircle2 className="h-4 w-4 mr-1" />{t('adminSourcing.action.validate')}
                          </Button>
                        )}
                        {req.status === 'validated' && req.result_file_url && (
                          <Button size="sm" variant="outline" onClick={() => downloadFile(req)}>
                            <Download className="h-4 w-4 mr-1" />{t('adminSourcing.action.download')}
                          </Button>
                        )}
                        {req.status !== 'archived' ? (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(req, 'archived')}>
                            <Archive className="h-4 w-4 mr-1" />{t('adminSourcing.action.archive')}
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(req, 'pending')}>
                            <RotateCcw className="h-4 w-4 mr-1" />{t('adminSourcing.action.unarchive')}
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

      {/* Validate dialog */}
      <Dialog open={validateOpen} onOpenChange={setValidateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('adminSourcing.validateDialog.title')}</DialogTitle>
            <DialogDescription>{t('adminSourcing.validateDialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>{t('adminSourcing.validateDialog.file')}</Label>
              <Input
                type="file"
                accept=".pdf,.docx,.doc,.xlsx,.csv"
                onChange={e => setUploadFile(e.target.files?.[0] || null)}
                className="mt-1.5"
              />
              {uploadFile && (
                <p className="text-xs text-muted-foreground mt-1">
                  {uploadFile.name} · {(uploadFile.size / 1024).toFixed(1)} KB
                </p>
              )}
            </div>
            <div>
              <Label>{t('adminSourcing.validateDialog.note')}</Label>
              <Textarea
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                rows={3}
                placeholder={t('adminSourcing.validateDialog.notePlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValidateOpen(false)} disabled={submitting}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleValidate} disabled={!uploadFile || submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {t('adminSourcing.validateDialog.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
      />
    </div>
  );
}