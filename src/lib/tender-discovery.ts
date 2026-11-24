import { isValid, parseISO } from 'date-fns';
import { canonicalCountry, countryLabel, normalizeText, splitMulti, type FilterOption } from './opportunity-filters';
import { cleanBuyerRequirements } from './opportunity-display';

export interface DiscoverableTender {
  id: string;
  reference: string;
  market: string;
  deadline_answer: string | null;
  category?: string | null;
  category_fr?: string | null;
  category_en?: string | null;
  designation_origin?: string | null;
  designation_origin_fr?: string | null;
  designation_origin_en?: string | null;
  style_profile?: string | null;
  style_profile_fr?: string | null;
  style_profile_en?: string | null;
  requirements?: string | null;
  requirements_fr?: string | null;
  requirements_en?: string | null;
  vintage?: string | null;
  price?: string | null;
  agent?: { company: string } | null;
}

export type TenderDeadlineState = 'open' | 'unconfirmed' | 'expired';
export type TenderSort = 'deadline_asc' | 'deadline_desc';
export interface TenderFilters { q: string; market: string; wine: string; deadline: '' | TenderDeadlineState; sort: TenderSort }
export const EMPTY_TENDER_FILTERS: TenderFilters = { q: '', market: '', wine: '', deadline: '', sort: 'deadline_asc' };
export const TENDER_PAGE_SIZE = 10;
const FETCH_SIZE = 200;

/** Fail closed on a failed batch: never present a truncated collection as complete. */
export async function fetchAllTenderPages<T>(readPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += FETCH_SIZE) {
    const result = await readPage(from, from + FETCH_SIZE - 1);
    if (result.error) throw result.error;
    const page = result.data ?? [];
    rows.push(...page);
    if (page.length < FETCH_SIZE) return rows;
  }
}

/** Keep different monopolies separate, but group their country/language variants. */
export function tenderMarket(input: string): { key: string; country: string; name: string; raw: string } {
  const normalized = normalizeText(input);
  const monopoly = ['systembolaget', 'vinmonopolet', 'alko', 'lcbo', 'wineability', 'rema'].find(name => normalized.split(' ').includes(name));
  const monopolyCountries: Record<string, string> = { systembolaget: 'SE', vinmonopolet: 'NO', alko: 'FI', lcbo: 'CA', wineability: 'SE', rema: 'DK' };
  const country = monopoly ? monopolyCountries[monopoly] : canonicalCountry(input);
  const names: Record<string, string> = { systembolaget: 'Systembolaget', vinmonopolet: 'Vinmonopolet', alko: 'Alko', lcbo: 'LCBO', wineability: 'Wineability', rema: 'Rema' };
  return { key: monopoly ? `${monopoly}:${country}` : country, country, name: monopoly ? names[monopoly] : '', raw: input };
}

export function tenderMarketLabel(input: string, lang: 'fr' | 'en'): string {
  const market = tenderMarket(input);
  const country = countryLabel(market.country, market.raw, lang);
  return market.name ? `${market.name} (${country})` : country;
}

const WINE_PATTERNS: [string, RegExp][] = [
  ['sparkling', /\b(effervescent\w*|sparkling|mousseux|cremant|champagne|cava|prosecco)\b/],
  ['red', /\b(rouge\w*|red)\b/],
  ['white', /\b(blanc\w*|white)\b/],
  ['rose', /\b(rose\w*|rosado|rosato)\b/],
  ['sweet', /\b(liquoreux|moelleux|doux|sweet|dessert)\b/],
  ['fortified', /\b(fortifie\w*|fortified|porto|port|sherry)\b/],
  ['orange', /\borange\b/],
  ['spirit', /\b(spiritueux|spirits?)\b/],
];
export function tenderWineKeys(row: DiscoverableTender): string[] {
  const keys = new Set<string>();
  for (const category of [row.category, row.category_fr, row.category_en]) {
    for (const part of splitMulti(category)) {
      const normalized = normalizeText(part);
      const matches = WINE_PATTERNS.filter(([, pattern]) => pattern.test(normalized)).map(([key]) => key);
      if (matches.length) matches.forEach(key => keys.add(key));
      else if (normalized) keys.add(`raw:${normalized}`);
    }
  }
  return [...keys];
}

export function tenderFilterOptions(rows: DiscoverableTender[], lang: 'fr' | 'en', wineLabel: (key: string) => string): { markets: FilterOption[]; wines: FilterOption[] } {
  const markets = new Map<string, string>();
  const wines = new Map<string, string>();
  for (const row of rows) {
    const market = tenderMarket(row.market);
    if (market.key) markets.set(market.key, tenderMarketLabel(row.market, lang));
    for (const key of tenderWineKeys(row)) {
      if (!wines.has(key)) {
        const raw = [row[`category_${lang}`], row.category, row.category_fr, row.category_en]
          .flatMap(splitMulti).find(value => `raw:${normalizeText(value)}` === key);
        wines.set(key, key.startsWith('raw:') ? raw ?? key.slice(4) : wineLabel(key));
      }
    }
  }
  const sort = (values: Map<string, string>) => [...values].map(([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label, lang));
  return { markets: sort(markets), wines: sort(wines) };
}

/** Calendar dates expire only after their Paris day; invalid/ambiguous values have no invented deadline. */
export function tenderDeadline(value: string | null): { day: string; time: number | null } | null {
  const input = value?.trim();
  if (!input) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(input);
  const explicitTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(input);
  if (!dateOnly && !explicitTimestamp) return null;
  const parsed = parseISO(input);
  if (!isValid(parsed)) return null;
  return { day: dateOnly ? input : parisDay(parsed), time: dateOnly ? null : parsed.getTime() };
}

function parisDay(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function tenderDeadlineState(row: Pick<DiscoverableTender, 'deadline_answer'>, now: Date = new Date()): TenderDeadlineState {
  const deadline = tenderDeadline(row.deadline_answer);
  if (!deadline) return 'unconfirmed';
  const expired = deadline.time === null ? deadline.day < parisDay(now) : deadline.time < now.getTime();
  return expired ? 'expired' : 'open';
}

export function tenderDeadlineLabel(value: string | null, lang: 'fr' | 'en'): string | null {
  const deadline = tenderDeadline(value);
  if (!deadline) return null;
  const date = deadline.time === null ? new Date(`${deadline.day}T12:00:00Z`) : new Date(deadline.time);
  return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', { timeZone: 'Europe/Paris', day: 'numeric', month: 'short', year: 'numeric', ...(deadline.time === null ? {} : { hour: '2-digit', minute: '2-digit' }) }).format(date);
}

export function filterTenders<T extends DiscoverableTender>(rows: T[], filters: TenderFilters, now: Date = new Date()): T[] {
  const words = normalizeText(filters.q).split(' ').filter(Boolean);
  return rows.filter(row => {
    if (filters.market && tenderMarket(row.market).key !== filters.market) return false;
    if (filters.wine && !tenderWineKeys(row).includes(filters.wine)) return false;
    if (filters.deadline && tenderDeadlineState(row, now) !== filters.deadline) return false;
    const haystack = normalizeText([
      row.reference, row.market, tenderMarketLabel(row.market, 'fr'), tenderMarketLabel(row.market, 'en'),
      row.agent?.company, row.vintage, row.price,
      row.category, row.category_fr, row.category_en,
      row.designation_origin, row.designation_origin_fr, row.designation_origin_en,
      row.style_profile, row.style_profile_fr, row.style_profile_en,
      ...[row.requirements, row.requirements_fr, row.requirements_en].map(cleanBuyerRequirements),
    ].filter(Boolean).join(' '));
    return words.every(word => haystack.includes(word));
  }).sort((a, b) => {
    const da = tenderDeadline(a.deadline_answer);
    const db = tenderDeadline(b.deadline_answer);
    if (!da && db) return 1;
    if (da && !db) return -1;
    const order = da && db ? da.day.localeCompare(db.day) || (da.time ?? Number.MAX_SAFE_INTEGER) - (db.time ?? Number.MAX_SAFE_INTEGER) : 0;
    return (filters.sort === 'deadline_desc' ? -order : order) || a.reference.localeCompare(b.reference) || a.id.localeCompare(b.id);
  });
}

/** Pagination always follows filtering and sorting over the complete collection. */
export function tenderPage<T>(rows: T[], requestedPage: number): { rows: T[]; page: number; pages: number; total: number } {
  const pages = Math.max(1, Math.ceil(rows.length / TENDER_PAGE_SIZE));
  const page = Math.max(1, Math.min(requestedPage, pages));
  return { rows: rows.slice((page - 1) * TENDER_PAGE_SIZE, page * TENDER_PAGE_SIZE), page, pages, total: rows.length };
}