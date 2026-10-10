import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { X, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCrmAccess } from '@/hooks/useCrmAccess';

/** Trial banner, welcome block and read-only / closed notices for ExportVins trial accounts. */
const TrialCrmBanner = () => {
  const { t } = useTranslation();
  const a = useCrmAccess();
  const { user } = useAuth();
  const exportCsv = async () => {
    if (!user) return;
    const { data } = await supabase.from('leads')
      .select('company_name, first_name, last_name, email, phone, country, city, website_url, status, next_action, next_action_at, owner_notes, campaigns!inner(user_id, name)')
      .eq('campaigns.user_id', user.id).limit(5000);
    const cols = ['company_name','first_name','last_name','email','phone','country','city','website_url','status','next_action','next_action_at','owner_notes'];
    const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = '\uFEFF' + [cols.join(';'), ...(data || []).map((r: any) => cols.map((c) => q(r[c])).join(';'))].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const el = document.createElement('a'); el.href = url; el.download = 'prospects-wineexporters.csv'; el.click(); URL.revokeObjectURL(url);
  };
  if (a.loading || !a.isTrialAccount) return null;

  if (a.isClosed) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <div className="rounded-2xl border border-border bg-card p-8 space-y-4 text-center">
          <Lock className="h-8 w-8 text-primary mx-auto" />
          <h2 className="text-2xl font-heading">{t('trial.closedTitle')}</h2>
          <p className="text-muted-foreground">{t('trial.closedText')}</p>
          <Button asChild><a href="https://calendar.app.google/rfx7N1bBhJcbwyJg9" target="_blank" rel="noopener noreferrer">{t('trial.bookCall')}</a></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pt-4 space-y-3">
      {a.isReadonly ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-2">
          <span><strong>{t('trial.readonlyTitle')}</strong> {t('trial.readonlyText')}</span>
          <span className="flex gap-3"><button onClick={exportCsv} className="text-primary underline underline-offset-2">{t('trial.exportCsv')}</button><a href="https://calendar.app.google/rfx7N1bBhJcbwyJg9" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{t('trial.bookCall')}</a></span>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-secondary/40 px-4 py-2 text-sm flex flex-wrap items-center justify-between gap-2">
          <span>{t('trial.banner', { count: a.daysLeft })}</span>
          <a href="https://calendar.app.google/rfx7N1bBhJcbwyJg9" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{t('trial.discover')}</a>
        </div>
      )}
      {a.showWelcome && (
        <div className="relative rounded-xl border border-border bg-card p-6 space-y-3">
          <button onClick={a.dismissWelcome} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground" aria-label="close">
            <X className="h-4 w-4" />
          </button>
          <h2 className="text-xl font-heading">{t('trial.welcomeTitle')}</h2>
          <p className="text-muted-foreground">{t('trial.welcomeText')}</p>
          <ol className="list-decimal pl-5 space-y-1 text-sm text-foreground">
            {(t('trial.welcomeSteps', { returnObjects: true }) as string[]).map((s) => <li key={s}>{s}</li>)}
          </ol>
        </div>
      )}
    </div>
  );
};

export default TrialCrmBanner;
