import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import { BellRing, CheckCircle2, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { leadDisplayName, type PriorityAction } from '@/lib/dashboard-actions';

/** actions === null means the CRM could not be loaded (shown as unavailable, never as "0"). */
export function PriorityActions({ actions }: { actions: PriorityAction[] | null }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? enUS : fr;
  const shown = actions?.slice(0, 3) ?? [];
  const extra = actions ? actions.length - shown.length : 0;

  return (
    <section className="mb-8 rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <BellRing className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">{t('dashboardPage.priority.title')}</h2>
      </div>

      {actions === null ? (
        <p className="text-sm text-destructive">{t('dashboardPage.priority.unavailable')}</p>
      ) : actions.length === 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" /> {t('dashboardPage.priority.empty')}
          </p>
          <Link to="/pipeline" className="text-sm font-medium text-primary">{t('dashboardPage.priority.openCrm')}</Link>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border">
            {shown.map((a) => {
              const name = leadDisplayName(a.lead) ?? t('dashboardPage.priority.unnamed');
              return (
                <li key={a.lead.id}>
                  <Link to={`/prospects/${a.lead.id}`} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:gap-3 hover:text-primary">
                    <Badge variant="outline" className={a.when === 'overdue' ? 'w-fit border-transparent bg-primary text-primary-foreground' : 'w-fit bg-secondary text-primary'}>
                      {t(`dashboardPage.priority.${a.when}`)}
                    </Badge>
                    <span className="flex-1 min-w-0">
                      <span className="font-medium text-foreground">{name}</span>
                      {a.lead.country && <span className="text-muted-foreground"> · {a.lead.country}</span>}
                      <span className="block truncate text-sm text-muted-foreground">
                        {a.note ?? t(`dashboardPage.priority.kind.${a.kind}`)}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">{format(new Date(a.dueAt), 'd MMM yyyy', { locale })}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            {extra > 0 ? <span className="text-muted-foreground">{t('dashboardPage.priority.more', { count: extra })}</span> : <span />}
            <Link to="/pipeline" className="inline-flex items-center gap-1 font-medium text-primary">
              {t('dashboardPage.priority.openCrm')} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
