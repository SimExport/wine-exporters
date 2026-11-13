import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, Mail, Copy, CheckCircle2, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { addImporterToCrm } from '@/components/importers/importer-crm';
import { getOrCreateManualCampaign } from '@/lib/manual-campaign';
import type { ImporterContact } from '@/lib/importer-profile';

const FN = 'weekly-importer-recommendations';

interface Recommendation {
  id: string;
  buyer_contact_id: string;
  reason: string | null;
  opportunity_id: string | null;
  status: string | null;
  email_subject: string | null;
  email_body: string | null;
  contact: ImporterContact | null;
}

/** Compact weekly suggestions shown inside the "Actions prioritaires" block. Server owns selection, premium check and drafting. */
export function WeeklyImporterRecommendations({ profileIncomplete }: { profileIncomplete?: boolean }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Recommendation | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase.functions.invoke(FN, { body: { action: 'list' } }).then(({ data, error }) => {
      if (cancelled) return;
      // Non-premium, no match or any error: show nothing (non-blocking).
      setItems(error ? null : ((data?.recommendations ?? []) as Recommendation[]));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user]);

  const patch = (id: string, p: Partial<Recommendation>) =>
    setItems((prev) => prev?.map((r) => (r.id === id ? { ...r, ...p } : r)) ?? prev);

  const openDraft = async (r: Recommendation) => {
    setOpen(r);
    setSubject(r.email_subject ?? '');
    setBody(r.email_body ?? '');
    if (r.email_subject || r.email_body) return;
    setDrafting(true);
    const { data, error } = await supabase.functions.invoke(FN, { body: { action: 'draft', recommendation_id: r.id } });
    setDrafting(false);
    if (error || !data) {
      toast({ title: t('dashboardPage.weekly.draftError'), variant: 'destructive' });
      return;
    }
    setSubject(data.subject ?? '');
    setBody(data.body ?? '');
    patch(r.id, { email_subject: data.subject ?? '', email_body: data.body ?? '' });
  };

  const dismiss = async (r: Recommendation) => {
    const { error } = await supabase.functions.invoke(FN, { body: { action: 'dismiss', recommendation_id: r.id } });
    if (error) toast({ title: t('dashboardPage.weekly.actionError'), variant: 'destructive' });
    else setItems((prev) => prev?.filter((x) => x.id !== r.id) ?? prev);
  };

  const email = open?.contact?.email?.trim() ?? '';
  const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${email}\n\n${subject}\n\n${body}`);
      toast({ title: t('dashboardPage.weekly.copied') });
    } catch {
      toast({ title: t('dashboardPage.weekly.actionError'), variant: 'destructive' });
    }
  };

  const markSent = async () => {
    if (!open || !user || !open.contact) return;
    setBusy(true);
    try {
      await getOrCreateManualCampaign(user.id);
      const res = await addImporterToCrm(supabase, user.id, { ...open.contact, id: open.contact.id ?? open.buyer_contact_id });
      if (res !== 'added' && res !== 'duplicate') throw new Error(res);
      const { error } = await supabase.functions.invoke(FN, { body: { action: 'contacted', recommendation_id: open.id } });
      if (error) throw error;
      patch(open.id, { status: 'contacted', email_subject: subject, email_body: body });
      toast({ title: t(res === 'added' ? 'dashboardPage.weekly.crmAdded' : 'dashboardPage.weekly.crmDuplicate') });
      setOpen(null);
    } catch {
      toast({ title: t('dashboardPage.weekly.actionError'), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="mt-4 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />{t('dashboardPage.weekly.loading')}</p>;
  }
  const visible = (items ?? []).filter((r) => r.status !== 'dismissed');
  if (!visible.length) {
    return profileIncomplete && items ? (
      <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
        {t('dashboardPage.weekly.completeProfile')} <Link to="/profile" className="font-medium text-primary">{t('dashboardPage.weekly.completeLink')}</Link>
      </p>
    ) : null;
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Sparkles className="h-4 w-4 text-primary" /> {t('dashboardPage.weekly.title')}
      </h3>
      {profileIncomplete && (
        <p className="mb-2 text-xs text-muted-foreground">
          {t('dashboardPage.weekly.completeProfile')} <Link to="/profile" className="font-medium text-primary">{t('dashboardPage.weekly.completeLink')}</Link>
        </p>
      )}
      <ul className="divide-y divide-border">
        {visible.map((r) => {
          const contacted = r.status === 'contacted';
          return (
            <li key={r.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{r.contact?.company_name ?? '—'}</span>
                  {r.contact?.country && <span className="text-sm text-muted-foreground">· {r.contact.country}</span>}
                  {r.opportunity_id && <Badge variant="outline" className="bg-secondary text-primary">{t('dashboardPage.weekly.purchaseRequest')}</Badge>}
                  {contacted && <Badge variant="outline" className="gap-1 text-primary"><CheckCircle2 className="h-3 w-3" />{t('dashboardPage.weekly.contacted')}</Badge>}
                </div>
                {r.reason && <p className="line-clamp-2 text-sm text-muted-foreground">{r.reason}</p>}
              </div>
              {!contacted && (
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" onClick={() => openDraft(r)}><Mail className="mr-1 h-3.5 w-3.5" />{t('dashboardPage.weekly.prepare')}</Button>
                  <Button size="sm" variant="ghost" onClick={() => dismiss(r)}><X className="mr-1 h-3.5 w-3.5" />{t('dashboardPage.weekly.dismiss')}</Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Dialog open={!!open} onOpenChange={(o) => !o && !busy && setOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{open?.contact?.company_name ?? t('dashboardPage.weekly.title')}</DialogTitle>
            <DialogDescription>{t('dashboardPage.weekly.dialogDesc')}</DialogDescription>
          </DialogHeader>
          {drafting ? (
            <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t('dashboardPage.weekly.drafting')}</p>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t('dashboardPage.weekly.to')}</p>
                <p className="text-sm text-foreground">{email || t('dashboardPage.weekly.noEmail')}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">{t('dashboardPage.weekly.subject')}</p>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">{t('dashboardPage.weekly.body')}</p>
                <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm" disabled={!email}>
                  <a href={email ? mailto : undefined}><Mail className="mr-1 h-3.5 w-3.5" />{t('dashboardPage.weekly.openMail')}</a>
                </Button>
                <Button variant="outline" size="sm" onClick={copy}><Copy className="mr-1 h-3.5 w-3.5" />{t('dashboardPage.weekly.copy')}</Button>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col items-stretch gap-2 sm:flex-col">
            <p className="text-xs text-muted-foreground">{t('dashboardPage.weekly.sentHint')}</p>
            <Button onClick={markSent} disabled={busy || drafting}>
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
              {t('dashboardPage.weekly.markSent')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
