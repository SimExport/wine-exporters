// One React-free catalogue for the producer chooser, reconciliation and both send paths.
export const MIN_CAMPAIGN_MARKETS = 5;
export const MAX_CAMPAIGN_MARKETS = 20;
export const MIN_CAMPAIGN_EMAILS = 1;
// Simon authorised go-live on 24/11/2026: audiences prepared, senders deployed with the fail-closed preflight.
export const CAMPAIGN_MARKET_EXTENSION_ENABLED = true;
export const CAMPAIGN_MARKET_SEND_EXTENSION_ENABLED = true;
export const CAMPAIGN_MARKET_GROUPS = ['europe', 'northAmerica', 'latinAmerica', 'asia', 'middleEast', 'africa', 'oceania'] as const;
export type CampaignMarketGroup = typeof CAMPAIGN_MARKET_GROUPS[number];
export interface CampaignMarket {
  code: string;
  value: string;
  group: CampaignMarketGroup;
  existing: boolean;
  listIds: readonly number[];
}
const market = (code: string, value: string, group: CampaignMarketGroup, listIds: number[], existing = true): CampaignMarket => ({ code, value, group, listIds, existing });
// IDs were read from Brevo or returned by its list creation, never inferred. An empty array blocks the market.
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
  market('AR', 'Argentina', 'latinAmerica', [134]), market('BR', 'Brazil', 'latinAmerica', [138]), market('CL', 'Chile', 'latinAmerica', [180]),
  market('CO', 'Colombia', 'latinAmerica', [140]), market('PE', 'Peru', 'latinAmerica', [181]),
  market('CN', 'China', 'asia', [139]), market('HK', 'Hong Kong', 'asia', [38]), market('IN', 'India', 'asia', [151]),
  market('JP', 'Japan', 'asia', [154]), market('SG', 'Singapore', 'asia', [166]), market('KR', 'South Korea', 'asia', [169]),
  market('TW', 'Taiwan', 'asia', [173]), market('TH', 'Thailand', 'asia', [174]), market('AE', 'UAE', 'middleEast', [182]), market('VN', 'Vietnam', 'asia', [177]),
  market('AU', 'Australia', 'oceania', [135]), market('MA', 'Morocco', 'africa', [183]),
  market('NG', 'Nigeria', 'africa', [184]), market('ZA', 'South Africa', 'africa', [168]),
  market('PH', 'Philippines', 'asia', [185], false), market('SK', 'Slovakia', 'europe', [167], false),
  market('ID', 'Indonesia', 'asia', [186], false), market('BG', 'Bulgaria', 'europe', [21], false), market('CY', 'Cyprus', 'europe', [142], false),
  market('MY', 'Malaysia', 'asia', [187], false), market('LU', 'Luxembourg', 'europe', [157], false),
  market('IS', 'Iceland', 'europe', [188], false), market('AZ', 'Azerbaijan', 'asia', [189], false),
  market('SI', 'Slovenia', 'europe', [190], false), market('MT', 'Malta', 'europe', [158], false),
  market('LT', 'Lithuania', 'europe', [156], false), market('LV', 'Latvia', 'europe', [155], false),
  market('NZ', 'New Zealand', 'oceania', [191], false), market('IL', 'Israel', 'middleEast', [192], false),
  market('KH', 'Cambodia', 'asia', [193], false), market('AL', 'Albania', 'europe', [194], false),
  market('CR', 'Costa Rica', 'latinAmerica', [195], false), market('PR', 'Puerto Rico', 'latinAmerica', [196], false),
  market('KE', 'Kenya', 'africa', [197], false), market('EC', 'Ecuador', 'latinAmerica', [198], false),
  market('UY', 'Uruguay', 'latinAmerica', [199], false), market('DO', 'Dominican Republic', 'latinAmerica', [200], false),
  market('TR', 'Turkey', 'middleEast', [201], false), market('ME', 'Montenegro', 'europe', [202], false),
  market('PA', 'Panama', 'latinAmerica', [203], false), market('MU', 'Mauritius', 'africa', [204], false),
  market('KZ', 'Kazakhstan', 'asia', [205], false), market('SC', 'Seychelles', 'africa', [206], false),
  market('MV', 'Maldives', 'asia', [207], false), market('MO', 'Macau', 'asia', [208], false),
  market('GT', 'Guatemala', 'latinAmerica', [209], false), market('UA', 'Ukraine', 'europe', [210], false),
  market('AM', 'Armenia', 'asia', [211], false), market('LB', 'Lebanon', 'middleEast', [212], false),
  market('BA', 'Bosnia and Herzegovina', 'europe', [213], false), market('MK', 'North Macedonia', 'europe', [214], false),
  market('JM', 'Jamaica', 'latinAmerica', [215], false), market('BH', 'Bahrain', 'middleEast', [216], false),
  market('JO', 'Jordan', 'middleEast', [217], false), market('PF', 'French Polynesia', 'oceania', [218], false),
  market('NC', 'New Caledonia', 'oceania', [219], false), market('AD', 'Andorra', 'europe', [220], false),
  market('SM', 'San Marino', 'europe', [221], false), market('NA', 'Namibia', 'africa', [222], false),
  market('PY', 'Paraguay', 'latinAmerica', [223], false), market('SV', 'El Salvador', 'latinAmerica', [224], false),
  market('HN', 'Honduras', 'latinAmerica', [225], false), market('FJ', 'Fiji', 'oceania', [226], false),
  market('NI', 'Nicaragua', 'latinAmerica', [227], false), market('CW', 'Curacao', 'latinAmerica', [228], false),
  market('AW', 'Aruba', 'latinAmerica', [229], false), market('GH', 'Ghana', 'africa', [230], false),
  market('SN', 'Senegal', 'africa', [231], false), market('TZ', 'Tanzania', 'africa', [232], false),
  market('BS', 'Bahamas', 'latinAmerica', [233], false), market('BB', 'Barbados', 'latinAmerica', [234], false),
  market('TT', 'Trinidad and Tobago', 'latinAmerica', [235], false),
];

const ALIASES: Record<string, string> = {
  us: 'united states', usa: 'united states', 'u.s.': 'united states', 'u.s.a.': 'united states',
  'united states of america': 'united states', 'états-unis': 'united states', 'etats-unis': 'united states',
  uk: 'united kingdom', gb: 'united kingdom', 'u.k.': 'united kingdom', 'great britain': 'united kingdom',
  'england (uk)': 'united kingdom', 'scotland (uk)': 'united kingdom', 'wales (uk)': 'united kingdom',
  england: 'united kingdom', scotland: 'united kingdom', wales: 'united kingdom', 'northern ireland': 'united kingdom',
  'northern ireland (uk)': 'united kingdom', 'royaume-uni': 'united kingdom',
  uae: 'united arab emirates', 'émirats arabes unis': 'united arab emirates',
  czechia: 'czech republic', 'république tchèque': 'czech republic',
  'the netherlands': 'netherlands', 'pays-bas': 'netherlands',
  'bosnia-herzegovina': 'bosnia and herzegovina',
  'bosnia herzegovina': 'bosnia and herzegovina', 'bosnia & herzegovina': 'bosnia and herzegovina',
  'bosnia and hercegovina': 'bosnia and herzegovina', 'bosnie-herzégovine': 'bosnia and herzegovina',
  türkiye: 'turkey', turkiye: 'turkey', turquie: 'turkey', macao: 'macau', curaçao: 'curacao',
  'republic of north macedonia': 'north macedonia', macedonia: 'north macedonia',
  slovaquie: 'slovakia', indonésie: 'indonesia', bulgarie: 'bulgaria', chypre: 'cyprus',
  malaisie: 'malaysia', islande: 'iceland', 'azerbaïdjan': 'azerbaijan',
};
export function normalizeCampaignMarket(value: unknown): string {
  if (typeof value !== 'string') return '';
  const key = value.normalize('NFKC').replace(/[‐‑–—]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();
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
const LEGACY_LISTS: Record<string, number> = { france: 147, russia: 164 };
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