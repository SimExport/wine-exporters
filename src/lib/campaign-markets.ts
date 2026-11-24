import { COUNTRIES } from '../components/importers/country-data';
import { CAMPAIGN_MARKETS, CAMPAIGN_MARKET_GROUPS, CAMPAIGN_MARKET_EXTENSION_ENABLED, CAMPAIGN_MARKET_SEND_EXTENSION_ENABLED, MIN_CAMPAIGN_EMAILS, findCampaignMarket, normalizeCampaignMarket, distinctCampaignMarkets, type CampaignMarket } from '../../supabase/functions/_shared/campaign-markets';
import { CAMPAIGN_MARKET_READINESS, type MarketReadiness } from '../../supabase/functions/_shared/campaign-market-readiness';

export interface CampaignMarketCount { country: string; usable_email_count: number | string }
export type CampaignMarketBlockReason = 'missing_list' | 'no_audience' | 'unverified' | 'no_contacts' | 'sender_update_required';
export interface CampaignMarketOption extends CampaignMarket { label: string; flag: string; sendBlockReason: CampaignMarketBlockReason | null }
export type CampaignMarketRpc = { rpc: (name: string) => PromiseLike<{ data: unknown; error: unknown }> };

export function campaignMarketLabel(value: string, language: string): string {
  const m = findCampaignMarket(value);
  const country = COUNTRIES.find(c => c.code === m?.code || normalizeCampaignMarket(c.englishName) === normalizeCampaignMarket(value));
  return country ? (language.startsWith('en') ? country.englishName : country.name) : value;
}
export function campaignMarketFlag(code: string): string {
  return /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map(c => 0x1f1e6 + c.charCodeAt(0) - 65)) : '';
}
export function marketIsReady(market: CampaignMarket, readiness: Record<string, MarketReadiness> = CAMPAIGN_MARKET_READINESS): boolean {
  const r = readiness[market.code];
  return !!r && r.nonBlockedContacts > 0 && market.listIds.length > 0 && r.listIds.length === market.listIds.length && market.listIds.every(id => r.listIds.includes(id));
}
export function campaignMarketOptions(counts: readonly CampaignMarketCount[] | null, language: string, readiness = CAMPAIGN_MARKET_READINESS, extensionEnabled = CAMPAIGN_MARKET_EXTENSION_ENABLED, sendExtensionEnabled = CAMPAIGN_MARKET_SEND_EXTENSION_ENABLED): CampaignMarketOption[] {
  const eligible = new Set((counts ?? []).filter(c => Number(c.usable_email_count) >= MIN_CAMPAIGN_EMAILS).map(c => normalizeCampaignMarket(c.country)));
  // Every approved market can be explored/saved in a draft, even below 50 contacts.
  // Availability is explicit and submission stays blocked until the whole audience is ready.
  return CAMPAIGN_MARKETS.filter(m => extensionEnabled || m.existing).map(m => {
    const r = readiness[m.code];
    const sendBlockReason: CampaignMarketBlockReason | null = !m.listIds.length ? 'missing_list'
      : !r || r.listIds.length !== m.listIds.length || !m.listIds.every(id => r.listIds.includes(id)) ? 'unverified'
      : !marketIsReady(m, readiness) ? 'no_audience'
      : !m.existing && counts === null ? 'unverified'
      : !m.existing && !eligible.has(normalizeCampaignMarket(m.value)) ? 'no_contacts'
      : !m.existing && !sendExtensionEnabled ? 'sender_update_required' : null;
    return { ...m, label: campaignMarketLabel(m.value, language), flag: campaignMarketFlag(m.code), sendBlockReason };
  });
}
export function blockedSelectedMarkets(selected: readonly string[], options: readonly CampaignMarketOption[]): CampaignMarketOption[] {
  const keys = new Set(selected.map(normalizeCampaignMarket));
  return options.filter(m => keys.has(normalizeCampaignMarket(m.value)) && m.sendBlockReason !== null);
}
export function groupCampaignMarkets(options: readonly CampaignMarketOption[]) {
  return CAMPAIGN_MARKET_GROUPS.map(group => [group, options.filter(m => m.group === group)] as const);
}
export function unavailableSelectedMarkets(selected: readonly string[], options: readonly CampaignMarketOption[]): string[] {
  const available = new Set(options.map(m => normalizeCampaignMarket(m.value)));
  return distinctCampaignMarkets(selected).filter(value => !available.has(normalizeCampaignMarket(value)));
}
export async function fetchCampaignMarketCounts(client: CampaignMarketRpc): Promise<CampaignMarketCount[] | null> {
  try {
    const { data, error } = await client.rpc('get_campaign_market_counts');
    if (error || !Array.isArray(data)) throw new Error('Market aggregate unavailable');
    if (!data.every(row => row && typeof row.country === 'string' && Number.isSafeInteger(Number(row.usable_email_count)) && Number(row.usable_email_count) >= 0)) throw new Error('Invalid market aggregate');
    return data.map(row => ({ country: row.country, usable_email_count: Number(row.usable_email_count) }));
  } catch {
    console.error('Campaign market counts unavailable'); // No tokens, emails or raw provider errors.
    return null;
  }
}