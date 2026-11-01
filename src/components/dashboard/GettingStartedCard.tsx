import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';

interface Props {
  /** null = could not be loaded: shown as unknown, never as done, and the card stays visible. */
  done: { profile: boolean | null; opportunities: boolean | null; search: boolean | null; campaign: boolean | null; crm: boolean | null };
}

/** Steps are computed by the dashboard from data it already loads; the card hides once all five are done. */
export function GettingStartedCard({ done }: Props) {
  const { t } = useTranslation();

  const items: { key: string; to: string; done: boolean | null }[] = [
    { key: 's1', to: '/profile', done: done.profile },
    { key: 's2', to: '/opportunites', done: done.opportunities },
    { key: 's3', to: '/recherches', done: done.search },
    { key: 's4', to: '/campaigns', done: done.campaign },
    { key: 's5', to: '/pipeline', done: done.crm },
  ];

  if (items.every((it) => it.done === true)) return null;
  const anyUnknown = items.some((it) => it.done === null);

  return (
    <div className="mb-8 rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">{t('gettingStarted.dashboard.title')}</h2>
        <Link to="/ressources/bien-demarrer" className="text-sm font-medium text-primary">
          {t('gettingStarted.dashboard.guide')}
        </Link>
      </div>
      <ol className="divide-y divide-border">
        {items.map((it, i) => (
          <li key={it.key}>
            <Link to={it.to} className="flex items-center gap-3 py-2.5 text-sm hover:text-primary">
              {it.done
                ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-label={t('gettingStarted.dashboard.done')} />
                : <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />}
              <span className={`flex-1 ${it.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                {i + 1}. {t(`gettingStarted.dashboard.${it.key}`)}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ol>
      {anyUnknown && <p className="mt-2 text-xs text-muted-foreground">{t('gettingStarted.dashboard.unavailable')}</p>}
    </div>
  );
}
