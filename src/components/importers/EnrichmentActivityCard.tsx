import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { COUNTRIES } from '@/components/importers/country-data';
import { getCountryFlag } from '@/lib/country-flag';
import { summarizeEnrichmentActivity, type EnrichmentActivitySummary, type EnrichmentActivityRow } from '@/lib/enrichment-activity';

const TXT = {
  fr: { title: 'Nouvelles fiches enrichies', today: '+{{n}} fiches enrichies aujourd’hui', week: '+{{n}} fiches enrichies ces 7 derniers jours', others: '+{{n}} autres pays', explore: 'Explorer la base' },
  en: { title: 'Newly enriched profiles', today: '+{{n}} profiles enriched today', week: '+{{n}} profiles enriched in the last 7 days', others: '+{{n}} more countries', explore: 'Explore the database' },
};

function findCountry(dbName: string) {
  const n = dbName.trim().toLowerCase();
  return COUNTRIES.find(c => c.englishName.toLowerCase() === n || c.name.toLowerCase() === n
    || c.dbAliases.some(a => a.toLowerCase() === n));
}

interface Props { variant?: 'card' | 'banner'; onSelectCountry?: (code: string) => void }

export function EnrichmentActivityCard({ variant = 'card', onSelectCountry }: Props) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith('en') ? 'en' : 'fr';
  const tx = TXT[lang];
  const [summary, setSummary] = useState<EnrichmentActivitySummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rpc = supabase.rpc as any;
      const [today, week] = await Promise.all([
        rpc('get_enrichment_activity', { _days: 1 }),
        rpc('get_enrichment_activity', { _days: 7 }),
      ]);
      if (cancelled || today.error || week.error) return;
      setSummary(summarizeEnrichmentActivity((today.data ?? []) as EnrichmentActivityRow[], (week.data ?? []) as EnrichmentActivityRow[]));
    })();
    return () => { cancelled = true; };
  }, []);

  if (!summary || summary.period === 'none') return null;
  const headline = (summary.period === 'today' ? tx.today : tx.week).replace('{{n}}', String(summary.total));

  const chips = summary.shown.map(r => {
    const c = findCountry(r.country);
    const label = c ? (lang === 'en' ? c.englishName : c.name) : r.country;
    const content = <><span>{getCountryFlag(r.country)}</span><span className="font-semibold">+{r.enriched_count}</span><span>{label}</span></>;
    const cls = 'inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-sm text-primary';
    return onSelectCountry && c
      ? <button key={r.country} type="button" onClick={() => onSelectCountry(c.code)} className={`${cls} hover:bg-accent/30 transition-colors`}>{content}</button>
      : <span key={r.country} className={cls}>{content}</span>;
  });

  return (
    <div className={`rounded-xl border border-border bg-card ${variant === 'card' ? 'p-5 mb-8' : 'p-4 mb-6'}`}>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="bg-accent/20 rounded-lg p-2"><Sparkles className="h-4 w-4 text-primary" /></div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tx.title}</p>
          <p className="font-semibold text-foreground">{headline}</p>
        </div>
        {variant === 'card' && (
          <Link to="/importers" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            {tx.explore} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {chips}
        {summary.otherCountries > 0 && (
          <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
            {tx.others.replace('{{n}}', String(summary.otherCountries))}
          </span>
        )}
      </div>
    </div>
  );
}
