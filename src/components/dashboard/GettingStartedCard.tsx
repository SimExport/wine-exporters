import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Props { profileDone: boolean }

export function GettingStartedCard({ profileDone }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [done, setDone] = useState({ search: false, campaign: false, crm: false });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [s, c, l] = await Promise.all([
        supabase.from('sourcing_requests').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        // leads has no user_id column — count leads reachable through the user's campaigns
        supabase.from('leads').select('id, campaigns!inner(user_id)', { count: 'exact', head: true }).eq('campaigns.user_id', user.id),
      ]);
      setDone({ search: (s.count ?? 0) > 0, campaign: (c.count ?? 0) > 0, crm: (l.count ?? 0) > 0 });
    })();
  }, [user]);

  const items: { key: string; to: string; done?: boolean }[] = [
    { key: 's1', to: '/profile', done: profileDone },
    { key: 's2', to: '/opportunites' },
    { key: 's3', to: '/recherches', done: done.search },
    { key: 's4', to: '/campaigns', done: done.campaign },
    { key: 's5', to: '/pipeline', done: done.crm },
  ];

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
    </div>
  );
}
