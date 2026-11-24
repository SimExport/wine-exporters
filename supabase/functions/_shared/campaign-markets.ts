// One React-free catalogue for the producer chooser, reconciliation and both send paths.
export const MIN_CAMPAIGN_MARKETS = 5;
export const MAX_CAMPAIGN_MARKETS = 15;
export const MIN_CAMPAIGN_EMAILS = 50;
// Explicit rollout gate: user authorised code/tests only. Enable only AFTER all historical
// lists are ready and all deployed send paths carry this catalogue; never by an audit alone.
export const CAMPAIGN_MARKET_EXTENSION_ENABLED = false;
export const CAMPAIGN_MARKET_GROUPS = ['europe', 'northAmerica', 'latinAmerica', 'asia', 'oceaniaAfrica'] as const;
export type CampaignMarketGroup = typeof CAMPAIGN_MARKET_GROUPS[number];
export interface CampaignMarket {
  code: string;
  value: string;
  group: CampaignMarketGroup;
  existing: boolean;
  listIds: readonly number[];
}
const market = (code: string, value: string, group: CampaignMarketGroup, listIds: number[], existing = true): CampaignMarket => ({ code, value, group, listIds, existing });
// IDs were read from Brevo, never inferred. Empty arrays require separately authorised setup.
export const CAMPAIGN_MARKETS: readonly CampaignMarket[] = [
  market('AT', 'Austria', 'europe', [136]), market('BE', 'Belgium', 'europe', [137]), market('HR', 'Croatia', 'europe', [141]),
  market('CZ', 'Czech Republic', 'europe', [143]), market('DK', 'Denmark', 'europe', [144]), market('EE', 'Estonia', 'europe', [145]),
  market('FI', 'Finland', 'europe', [146]), market('DE', 'Germany', 'europe', [148]), market('GR', 'Greece', 'europe', [149]),
  market('HU', 'Hungary', 'europe', [150]), market('IE', 'Ireland', 'europe', [152]), market('IT', 'Italy', 'europe', [153]),
  market('NL', 'Netherlands', 'europe', [160]), market('NO', 'Norway', 'europe', [161]), market('PL', 'Poland', 'europe', [162]),
  market('PT', 'Portugal', 'europe', [10]), market('RO', 'Romania', 'europe', [163]), market('RS', 'Serbia', 'europe', [165]),
  market('ES', 'Spain', 'europe', [170]), market('SE', 'Sweden', 'europe', [171]), market('CH', 'Switzerland', 'europe', [172]),
  market('GB', 'United Kingdom', 'europe', [176]),
  market('CA', 'Canada', 'northAmerica', [33]), market('MX', 'Mexico', 'northAmerica', [159]), market('US', 'United States', 'northAmerica', [175]),
  market('AR', 'Argentina', 'latinAmerica', [134]), market('BR', 'Brazil', 'latinAmerica', [138]), market('CL', 'Chile', 'latinAmerica', []),
  market('CO', 'Colombia', 'latinAmerica', [140]), market('PE', 'Peru', 'latinAmerica', []),
  market('CN', 'China', 'asia', [139]), market('HK', 'Hong Kong', 'asia', [38]), market('IN', 'India', 'asia', [151]),
  market('JP', 'Japan', 'asia', [154]), market('SG', 'Singapore', 'asia', [166]), market('KR', 'South Korea', 'asia', [169]),
  market('TW', 'Taiwan', 'asia', [173]), market('TH', 'Thailand', 'asia', [174]), market('AE', 'UAE', 'asia', []), market('VN', 'Vietnam', 'asia', [177]),
  market('AU', 'Australia', 'oceaniaAfrica', [135]), market('MA', 'Morocco', 'oceaniaAfrica', []),
  market('NG', 'Nigeria', 'oceaniaAfrica', []), market('ZA', 'South Africa', 'oceaniaAfrica', [168]),
  market('PH', 'Philippines', 'asia', [], false), market('SK', 'Slovakia', 'europe', [167], false),
  market('ID', 'Indonesia', 'asia', [], false), market('BG', 'Bulgaria', 'europe', [21], false), market('CY', 'Cyprus', 'europe', [142], false),
  market('MY', 'Malaysia', 'asia', [], false), market('LU', 'Luxembourg', 'europe', [157], false),
  market('IS', 'Iceland', 'europe', [], false), market('AZ', 'Azerbaijan', 'asia', [], false),
];

const ALIASES: Record<string, string> = {
  us: 'united states', usa: 'united states', 'u.s.': 'united states', 'u.s.a.': 'united states',
  'united states of america': 'united states', 'états-unis': 'united states', 'etats-unis': 'united states',
  uk: 'united kingdom', gb: 'united kingdom', 'u.k.': 'united kingdom', 'great britain': 'united kingdom',
  'england (uk)': 'united kingdom', 'scotland (uk)': 'united kingdom', 'wales (uk)': 'united kingdom',
  'northern ireland (uk)': 'united kingdom', 'royaume-uni': 'united kingdom',
  uae: 'united arab emirates', 'émirats arabes unis': 'united arab emirates',
  czechia: 'czech republic', 'république tchèque': 'czech republic',
  'the netherlands': 'netherlands', 'pays-bas': 'netherlands',
  'bosnia-herzegovina': 'bosnia and herzegovina',
  slovaquie: 'slovakia', indonésie: 'indonesia', bulgarie: 'bulgaria', chypre: 'cyprus',
  malaisie: 'malaysia', islande: 'iceland', 'azerbaïdjan': 'azerbaijan',
};
export function normalizeCampaignMarket(value: unknown): string {
  if (typeof value !== 'string') return '';
  const key = value.replace(/\s+/g, ' ').trim().toLowerCase();
  return ALIASES[key] ?? key;
}
export function findCampaignMarket(value: string): CampaignMarket | undefined {
  const key = normalizeCampaignMarket(value);
  return CAMPAIGN_MARKETS.find(m => normalizeCampaignMarket(m.value) === key);
}
/** Preserve raw stored values; comparisons alone use canonical keys. */
export function distinctCampaignMarkets(values: readonly string[]): string[] {
  const seen = new Set<string>();
  return values.filter(value => {
    const key = normalizeCampaignMarket(value);
    if (!key || seen.has(key)) return false;
    seen.add(key); return true;
  });
}
export function campaignMarketRangeValid(values: readonly string[]): boolean {
  const count = distinctCampaignMarkets(values).length;
  return count >= MIN_CAMPAIGN_MARKETS && count <= MAX_CAMPAIGN_MARKETS;
}
// Historical maps not selectable in the chooser are retained for already saved campaigns.
const LEGACY_LISTS: Record<string, number> = { france: 147, latvia: 155, lithuania: 156, malta: 158, russia: 164 };
export function mapCampaignMarkets(values: readonly string[]): { listIds: number[]; unmatched: string[] } {
  const ids = new Set<number>(); const unmatched: string[] = [];
  for (const value of distinctCampaignMarkets(values)) {
    const idsForCountry = findCampaignMarket(value)?.listIds ?? (LEGACY_LISTS[normalizeCampaignMarket(value)] ? [LEGACY_LISTS[normalizeCampaignMarket(value)]] : []);
    if (!idsForCountry.length) unmatched.push(value);
    else idsForCountry.forEach(id => ids.add(id));
  }
  return { listIds: [...ids], unmatched };
}
export const CAMPAIGN_EMAIL_RE = /^[^\s@<>";,]+@[^\s@<>";,]+\.[^\s@<>";,]+$/;
export function campaignCandidateEmails(email: unknown, status: unknown): string[] {
  if (typeof email !== 'string') return [];
  if (typeof status === 'string' && /(^|[\s|,;])(do_not_mail|invalid|bounced|hard_bounce|blocked|blacklisted|unsubscribed|suppressed|abuse)([\s|,;]|$)/i.test(status)) return [];
  return [...new Set(email.split(/[\s,;]+/).map(e => e.replace(/^mailto:/i, '').toLowerCase()).filter(e => CAMPAIGN_EMAIL_RE.test(e)))];
}