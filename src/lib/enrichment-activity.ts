// React-free formatting for the daily enrichment counter (counts per country only).
export interface EnrichmentActivityRow { country: string; enriched_count: number }
export interface EnrichmentActivitySummary {
  period: 'today' | 'week' | 'none';
  total: number;
  shown: EnrichmentActivityRow[];
  otherCountries: number;
}

export function summarizeEnrichmentActivity(
  today: EnrichmentActivityRow[],
  week: EnrichmentActivityRow[],
  maxShown = 6,
): EnrichmentActivitySummary {
  const clean = (rows: EnrichmentActivityRow[]) => rows
    .map(r => ({ country: r.country, enriched_count: Number(r.enriched_count) || 0 }))
    .filter(r => r.country && r.enriched_count > 0)
    .sort((a, b) => b.enriched_count - a.enriched_count || a.country.localeCompare(b.country));
  const t = clean(today);
  const rows = t.length ? t : clean(week);
  const period = t.length ? 'today' : rows.length ? 'week' : 'none';
  return {
    period,
    total: rows.reduce((s, r) => s + r.enriched_count, 0),
    shown: rows.slice(0, maxShown),
    otherCountries: Math.max(0, rows.length - maxShown),
  };
}
