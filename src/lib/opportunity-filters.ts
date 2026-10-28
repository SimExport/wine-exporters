// React-free helpers for /opportunites filters, search and mailto drafts.

export function normalizeText(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’'`]/g, ' ')
    .replace(/[^a-z0-9&]+/g, ' ')
    .trim();
}

// Normalized alias -> ISO region code. Long aliases may match as substrings;
// short ones (<= 3 chars) only match exactly.
const COUNTRY_ALIASES: Record<string, string> = {
  suede: 'SE', sweden: 'SE', sverige: 'SE',
  france: 'FR',
  belgique: 'BE', belgium: 'BE', belgie: 'BE',
  allemagne: 'DE', germany: 'DE', deutschland: 'DE',
  'royaume uni': 'GB', 'united kingdom': 'GB', uk: 'GB', angleterre: 'GB', england: 'GB', 'great britain': 'GB',
  'etats unis': 'US', usa: 'US', us: 'US', 'united states': 'US',
  canada: 'CA',
  suisse: 'CH', switzerland: 'CH',
  'pays bas': 'NL', netherlands: 'NL', hollande: 'NL', holland: 'NL',
  italie: 'IT', italy: 'IT',
  espagne: 'ES', spain: 'ES',
  norvege: 'NO', norway: 'NO',
  finlande: 'FI', finland: 'FI',
  danemark: 'DK', denmark: 'DK',
  japon: 'JP', japan: 'JP',
  chine: 'CN', china: 'CN',
  irlande: 'IE', irelande: 'IE', ireland: 'IE',
  autriche: 'AT', austria: 'AT',
  pologne: 'PL', poland: 'PL',
  portugal: 'PT',
  luxembourg: 'LU',
  australie: 'AU', australia: 'AU',
  bresil: 'BR', brazil: 'BR',
  mexique: 'MX', mexico: 'MX',
  'coree du sud': 'KR', 'south korea': 'KR', korea: 'KR', coree: 'KR',
  singapour: 'SG', singapore: 'SG',
  'hong kong': 'HK',
  bulgarie: 'BG', bulgaria: 'BG',
};

/** Canonical key for a stored country/market string ('' when empty). */
export function canonicalCountry(input: string | null | undefined): string {
  const n = normalizeText(input);
  if (!n) return '';
  if (COUNTRY_ALIASES[n]) return COUNTRY_ALIASES[n];
  const long = Object.keys(COUNTRY_ALIASES).filter(k => k.length > 3).sort((a, b) => b.length - a.length);
  for (const k of long) if (` ${n} `.includes(` ${k} `)) return COUNTRY_ALIASES[k];
  return `raw:${n}`;
}

export function countryLabel(key: string, raw: string, lang: 'fr' | 'en'): string {
  if (!key.startsWith('raw:')) {
    try {
      const name = new Intl.DisplayNames([lang], { type: 'region' }).of(key);
      if (name) return name;
    } catch { /* fall back to stored value */ }
  }
  return raw;
}

export function splitMulti(s: string | null | undefined): string[] {
  if (!s) return [];
  return s.split(/[,/;]| - | – /).map(x => x.trim()).filter(Boolean);
}

export interface FilterOption { key: string; label: string }

/** Distinct options keyed by normalized value, label = first value seen, sorted by label. */
export function buildOptions(values: string[][], locale: string): FilterOption[] {
  const map = new Map<string, string>();
  for (const list of values) for (const v of list) {
    const k = normalizeText(v);
    if (k && !map.has(k)) map.set(k, v);
  }
  return [...map].map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, locale, { sensitivity: 'base' }));
}

export interface FilterableItem {
  country: string;      // canonical key
  styles: string[];     // raw values
  origins: string[];    // raw values
  haystack: string;     // free text
}

export interface FilterState { country: string; style: string; origin: string; q: string }
export const EMPTY_FILTERS: FilterState = { country: '', style: '', origin: '', q: '' };

export function matchesFilters(item: FilterableItem, f: FilterState): boolean {
  if (f.country && item.country !== f.country) return false;
  if (f.style && !item.styles.some(s => normalizeText(s) === f.style)) return false;
  if (f.origin && !item.origins.some(s => normalizeText(s) === f.origin)) return false;
  const q = normalizeText(f.q);
  if (q) {
    const hay = normalizeText(item.haystack);
    if (!q.split(' ').every(word => hay.includes(word))) return false;
  }
  return true;
}

export function hasActiveFilters(f: FilterState): boolean {
  return Boolean(f.country || f.style || f.origin || f.q.trim());
}

/** Requests published through WineExporters' own mediation mailbox. */
export function isMediatedEmail(email: string | null | undefined): boolean {
  return /@exportvins\.fr$/i.test((email ?? '').trim());
}

export function buildMailto(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to.trim()).replace(/%40/g, '@')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
