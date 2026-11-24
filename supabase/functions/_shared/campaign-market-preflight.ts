import { CAMPAIGN_EMAIL_RE, mapCampaignMarkets, normalizeCampaignMarket } from './campaign-markets.ts';

export interface MarketPreflightError { status: number; error: string; unmatched?: string[]; listId?: number; details?: string }
export type BrevoRead = (path: string) => Promise<Response>;
/** Read-only: resolve ALL countries, then prove each list has a non-blacklisted address.
 * Stop before any campaign mutation or provider POST. Never log contacts or provider bodies. */
export async function campaignMarketPreflight(markets: string[], read: BrevoRead): Promise<{ listIds: number[]; failure?: MarketPreflightError }> {
  const mapped = mapCampaignMarkets(markets);
  if (mapped.unmatched.length || !mapped.listIds.length) {
    return { listIds: [], failure: { status: 422, error: 'Target markets are not fully mapped', unmatched: mapped.unmatched } };
  }
  for (const listId of mapped.listIds) {
    try {
      const metadata = await read(`/contacts/lists/${listId}`);
      if (!metadata.ok) return { listIds: [], failure: { status: metadata.status === 404 ? 422 : 502, error: 'Target list unavailable', listId, details: `Brevo HTTP ${metadata.status}` } };
      const info = await metadata.json();
      const expectedMarket = markets.find(value => mapCampaignMarkets([value]).listIds.includes(listId));
      if (info.id !== listId || !expectedMarket || normalizeCampaignMarket(info.name) !== normalizeCampaignMarket(expectedMarket)) return { listIds: [], failure: { status: 422, error: 'Target list identity mismatch', listId } };
      let usable = false;
      for (let offset = 0; ; offset += 500) {
        const response = await read(`/contacts/lists/${listId}/contacts?limit=500&offset=${offset}`);
        if (!response.ok) return { listIds: [], failure: { status: 502, error: 'Target contacts unavailable', listId, details: `Brevo HTTP ${response.status}` } };
        const payload = await response.json();
        if (!Array.isArray(payload.contacts)) return { listIds: [], failure: { status: 502, error: 'Invalid target contacts response', listId } };
        usable = payload.contacts.some((c: { email?: unknown; emailBlacklisted?: unknown }) => typeof c.email === 'string' && c.emailBlacklisted === false && CAMPAIGN_EMAIL_RE.test(c.email));
        if (usable || payload.contacts.length < 500) break;
      }
      if (!usable) return { listIds: [], failure: { status: 422, error: 'Target list has no sendable contacts', listId } };
    } catch {
      return { listIds: [], failure: { status: 502, error: 'Target list check failed', listId } };
    }
  }
  return { listIds: mapped.listIds };
}