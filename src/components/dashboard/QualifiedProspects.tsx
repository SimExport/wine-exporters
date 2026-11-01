import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import { Users, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { InterestedContact } from '@/lib/dashboard-actions';

/** prospects === null means loading failed (unavailable, never "0"). */
export function QualifiedProspects({ prospects, campaignNames }: { prospects: InterestedContact[] | null; campaignNames: Record<string, string> }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? enUS : fr;

  return (
    <section className="mb-8 rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">{t('dashboardPage.qualified.title')}</h2>
      </div>
      {prospects === null ? (
        <p className="text-sm text-destructive">{t('dashboardPage.qualified.unavailable')}</p>
      ) : prospects.length === 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{t('dashboardPage.qualified.empty')}</p>
          <Link to="/campaigns" className="text-sm font-medium text-primary">{t('dashboardPage.qualified.cta')}</Link>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {prospects.map((p) => (
            <li key={p.id}>
              <Link to={`/campaigns/${p.campaign_id}`} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:gap-3 hover:text-primary">
                <span className="flex-1 min-w-0">
                  <span className="font-medium text-foreground">{p.company_name?.trim() || t('dashboardPage.priority.unnamed')}</span>
                  {p.country && <span className="text-muted-foreground"> · {p.country}</span>}
                  <span className="block truncate text-xs text-muted-foreground">
                    {campaignNames[p.campaign_id] ? `${campaignNames[p.campaign_id]} · ` : ''}
                    {t('dashboardPage.qualified.addedOn', { date: format(new Date(p.created_at), 'd MMM yyyy', { locale }) })}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-secondary text-primary">
                    {t(p.origin === 'form' ? 'dashboardPage.qualified.form' : 'dashboardPage.qualified.click')}
                  </Badge>
                  <span className="text-sm font-semibold text-foreground">{p.score}/10</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
