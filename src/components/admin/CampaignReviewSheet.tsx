import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CalendarClock, CheckCircle, FlaskConical, Loader2, RotateCcw, Search, Send, Unlock } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { EmailPreviewFrame } from '@/components/campaigns/email-editor/EmailPreviewFrame';
import { functionErrorMessage } from '@/lib/media-upload';
import { campaignPath, canStartSend, needsBrevoCheck, sendState } from '@/lib/campaign-send-state';
import { formatDate, formatDateTime } from '@/lib/format';
import { estimateSendDate, parisDayStart } from '@/lib/campaign-queue';

type Confirm = null | 'send' | 'test' | 'confirm_send' | 'release' | 'schedule' | 'cancel_schedule';

interface QueueInfo { row: any | null; ahead: number; estimated: string | null }

interface Props {
  campaign: any | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    <div className="text-sm">{children}</div>
  </div>
);

export const CampaignReviewSheet = ({ campaign, onOpenChange, onChanged }: Props) => {
  const { t } = useTranslation();
  const k = (s: string, o?: any) => t(`emailEditor.admin.${s}`, o) as string;
  const [details, setDetails] = useState<{ domain?: string; contact?: string; wines: string[]; docs: string[]; events: any[] }>({ wines: [], docs: [], events: [] });
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [reason, setReason] = useState('');
  const [checkResult, setCheckResult] = useState<string | null>(null);
  const [queueInfo, setQueueInfo] = useState<QueueInfo>({ row: null, ahead: 0, estimated: null });
  const [reloadKey, setReloadKey] = useState(0);
  const c = campaign;

  useEffect(() => {
    if (!c) return;
    setReason(''); setCheckResult(null);
    const docIds = [c.doc_presentation, c.doc_pricelist, ...(c.doc_techs ?? [])].filter(Boolean);
    Promise.all([
      supabase.from('profiles').select('domain_name, contact_name').eq('user_id', c.user_id).maybeSingle(),
      (c.selected_wines?.length ? supabase.from('wines').select('name').in('id', c.selected_wines) : Promise.resolve({ data: [] as any[] })),
      (docIds.length ? supabase.from('documents').select('title').in('id', docIds) : Promise.resolve({ data: [] as any[] })),
      supabase.from('campaign_events').select('type, payload, created_at').eq('campaign_id', c.id).order('created_at', { ascending: false }),
      (supabase.from as any)('campaign_send_queue').select('campaign_id,state,approved_at,error').eq('campaign_id', c.id).maybeSingle(),
      (supabase.from as any)('campaign_send_queue').select('campaign_id,approved_at').eq('state', 'queued').order('approved_at', { ascending: true }),
      supabase.from('campaigns').select('id', { count: 'exact', head: true }).in('status', ['active', 'sending', 'results']).gte('launched_at', parisDayStart().toISOString()),
    ]).then(([p, w, d, e, q, l, cnt]: any[]) => {
      setDetails({
        domain: p.data?.domain_name, contact: p.data?.contact_name,
        wines: (w.data ?? []).map((x: any) => x.name), docs: (d.data ?? []).map((x: any) => x.title), events: e.data ?? [],
      });
      const row = q.data ?? null;
      const queuedRows = l.data ?? [];
      const ahead = row?.state === 'queued' ? Math.max(0, queuedRows.findIndex((x: any) => x.campaign_id === c.id)) : 0;
      const estimated = row?.state === 'queued' ? estimateSendDate(ahead + 1, (cnt.count ?? 0) > 0) : null;
      setQueueInfo({ row, ahead, estimated });
    });
  }, [c, reloadKey]);

  if (!c) return null;
  const path = campaignPath(c);
  const state = sendState(c);
  const pending = c.status === 'pending_validation';
  const markets: string[] = (c.target_markets?.length ? c.target_markets : c.markets) ?? [];
  const rejections = details.events.filter((e) => e.type === 'rejected');
  const isTest = details.events.some((e) => e.type === 'test_campaign');

  const call = async (mode: string, extra: Record<string, unknown> = {}) => {
    setBusy(mode); setConfirm(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-campaign', { body: { campaignId: c.id, mode, ...extra } });
      if (error || data?.error) {
        toast({ title: k('errorTitle'), description: await functionErrorMessage(error, data), variant: 'destructive' });
        return;
      }
      if (mode === 'check') setCheckResult(data.result);
      toast({ title: k(`result.${data.result}`, { defaultValue: data.result }) });
    } finally { setBusy(null); onChanged(); }
  };

  const reject = async () => {
    if (!reason.trim()) { toast({ title: k('reasonRequired'), variant: 'destructive' }); return; }
    setBusy('reject');
    try {
      const { error } = await (supabase.rpc as any)('reject_campaign', { _id: c.id, _reason: reason.trim() });
      if (error) { toast({ title: k('errorTitle'), description: error.message, variant: 'destructive' }); return; }
      const { data, error: nErr } = await supabase.functions.invoke('notify-campaign-rejected', { body: { campaignId: c.id } });
      if (nErr || data?.error) toast({ title: k('rejectedNoMail'), variant: 'destructive' });
      else toast({ title: k('rejected') });
      onOpenChange(false);
    } finally { setBusy(null); onChanged(); }
  };

  const schedule = async () => {
    setBusy('schedule'); setConfirm(null);
    try {
      const { error } = await (supabase.rpc as any)('approve_campaign_for_queue', { _id: c.id });
      if (error) { toast({ title: k('errorTitle'), description: error.message, variant: 'destructive' }); return; }
      toast({ title: k('scheduledToast') });
      setReloadKey((n) => n + 1);
    } finally { setBusy(null); onChanged(); }
  };

  const cancelQueue = async () => {
    setBusy('cancel_schedule'); setConfirm(null);
    try {
      const { error } = await (supabase.rpc as any)('cancel_campaign_queue', { _id: c.id });
      if (error) { toast({ title: k('errorTitle'), description: error.message, variant: 'destructive' }); return; }
      toast({ title: k('scheduleCancelled') });
      setReloadKey((n) => n + 1);
    } finally { setBusy(null); onChanged(); }
  };

  const confirmText: Record<Exclude<Confirm, null>, string> = {
    send: k('confirmSend', { count: markets.length }),
    test: k('confirmTest'),
    confirm_send: k('confirmBrevoDraft'),
    release: k('confirmRelease'),
    schedule: k('confirmSchedule'),
    cancel_schedule: k('confirmCancelSchedule'),
  };

  return (
    <Sheet open={!!c} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex flex-wrap items-center gap-2">{c.name}
            <Badge variant="outline">{path === 'custom' ? k('custom') : k('legacy')}</Badge>
            {isTest && <Badge variant="secondary"><FlaskConical className="h-3 w-3 mr-1" />{k('test')}</Badge>}
          </SheetTitle>
          <SheetDescription>{details.domain || '—'}{details.contact ? ` · ${details.contact}` : ''}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {needsBrevoCheck(c) && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="space-y-3">
                <p className="font-medium">{k('checkNeeded')}</p>
                <p className="text-sm">{k('checkExplain')}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={!!busy} onClick={() => call('check')}>
                    {busy === 'check' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />}{k('check')}
                  </Button>
                  {(state === 'brevo_draft' || checkResult === 'brevo_draft') && (
                    <Button size="sm" disabled={!!busy} onClick={() => setConfirm('confirm_send')}><Send className="h-4 w-4 mr-1" />{k('sendBrevoDraft')}</Button>
                  )}
                  {checkResult === 'not_found' && !c.brevo_campaign_id && (
                    <Button size="sm" variant="outline" disabled={!!busy} onClick={() => setConfirm('release')}><Unlock className="h-4 w-4 mr-1" />{k('release')}</Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Row label={k('markets', { count: markets.length })}>{markets.join(', ') || '—'}</Row>
            <Row label={k('submittedAt')}>{c.validation_requested_at ? formatDateTime(c.validation_requested_at) : '—'}</Row>
            <Row label={k('wines')}>{details.wines.join(', ') || '—'}</Row>
            <Row label={k('documents')}>{details.docs.join(', ') || '—'}{c.techs_link ? <><br /><a className="text-primary underline break-all" href={c.techs_link} target="_blank" rel="noreferrer">{c.techs_link}</a></> : null}</Row>
          </div>
          {c.client_note && <Row label={k('instructions')}><p className="whitespace-pre-wrap">{c.client_note}</p></Row>}
          {rejections.length > 0 && (
            <Row label={k('rejections')}>
              <ul className="space-y-1">{rejections.map((r, i) => <li key={i} className="text-muted-foreground"><span className="font-medium text-foreground">{formatDateTime(r.created_at)}</span> — {r.payload?.reason}</li>)}</ul>
            </Row>
          )}

          {path === 'custom' ? (
            <Row label={k('email')}>
              <EmailPreviewFrame html={c.message_html} subject={c.subject_selected ?? undefined} sender="WineExporters <simon@exportvins.fr>" />
            </Row>
          ) : (
            <Alert><AlertDescription>{k('legacyExplain')}</AlertDescription></Alert>
          )}

          {pending && path === 'custom' && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex flex-wrap gap-2">
                <Button disabled={!!busy || !canStartSend(c) || isTest} onClick={() => setConfirm('send')}>
                  {busy === 'send' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}{k('validateSend')}
                </Button>
                <Button variant="outline" disabled={!!busy || !canStartSend(c)} onClick={() => setConfirm('test')}>
                  <FlaskConical className="h-4 w-4 mr-2" />{k('testSend')}
                </Button>
              </div>
              <div className="space-y-2">
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={2000} placeholder={k('reasonPlaceholder')} aria-label={k('reason')} />
                <Button variant="destructive" disabled={!!busy || state !== 'idle' && state !== 'failed'} onClick={reject}>
                  {busy === 'reject' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}{k('reject')}
                </Button>
              </div>
            </div>
          )}
        </div>

        <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{k('confirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>{confirm ? confirmText[confirm] : ''}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('emailEditor.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                if (confirm === 'send') call('send');
                else if (confirm === 'test') call('send', { test: true });
                else if (confirm === 'confirm_send') call('confirm_send', { confirm: true });
                else if (confirm === 'release') call('release', { confirm: true });
              }}>{k('confirmAction')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
};
