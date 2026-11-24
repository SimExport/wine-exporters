import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { CAMPAIGN_MARKETS, CAMPAIGN_MARKET_GROUPS, MIN_CAMPAIGN_MARKETS, MAX_CAMPAIGN_MARKETS, MIN_CAMPAIGN_EMAILS, normalizeCampaignMarket, distinctCampaignMarkets, campaignMarketRangeValid, mapCampaignMarkets, campaignCandidateEmails } from '../../supabase/functions/_shared/campaign-markets';
import { campaignMarketOptions as rawMarketOptions, fetchCampaignMarketCounts, unavailableSelectedMarkets } from './campaign-markets';
import type { MarketReadiness } from '../../supabase/functions/_shared/campaign-market-readiness';

const allReady: Record<string, MarketReadiness> = Object.fromEntries(CAMPAIGN_MARKETS.map(m => [m.code, { listIds: [...m.listIds], nonBlockedContacts: 100 }]));
const campaignMarketOptions = (counts: Parameters<typeof rawMarketOptions>[0], language: string, readiness: Record<string, MarketReadiness>) => rawMarketOptions(counts, language, readiness, true);
test('retains all 44 original markets and the same five geographical groups', () => {
  assert.equal(CAMPAIGN_MARKETS.filter(m => m.existing).length, 44);
  assert.deepEqual(CAMPAIGN_MARKETS.filter(m => m.existing).map(m => m.value), ['Austria','Belgium','Croatia','Czech Republic','Denmark','Estonia','Finland','Germany','Greece','Hungary','Ireland','Italy','Netherlands','Norway','Poland','Portugal','Romania','Serbia','Spain','Sweden','Switzerland','United Kingdom','Canada','Mexico','United States','Argentina','Brazil','Chile','Colombia','Peru','China','Hong Kong','India','Japan','Singapore','South Korea','Taiwan','Thailand','UAE','Vietnam','Australia','Morocco','Nigeria','South Africa']);
  assert.deepEqual([...CAMPAIGN_MARKET_GROUPS], ['europe', 'northAmerica', 'latinAmerica', 'asia', 'oceaniaAfrica']);
  assert.equal(new Set(CAMPAIGN_MARKETS.map(m => m.code)).size, 53);
});
test('50 distinct candidate emails is the inclusive threshold, 49 is excluded', () => {
  assert.equal(MIN_CAMPAIGN_EMAILS, 50);
  const readiness = { SK: allReady.SK, BG: allReady.BG };
  assert.equal(campaignMarketOptions([{ country: 'Slovakia ', usable_email_count: 49 }], 'fr', readiness).length, 0);
  assert.equal(campaignMarketOptions([{ country: 'Slovakia ', usable_email_count: 50 }], 'fr', readiness)[0]?.value, 'Slovakia');
});
test('nine audited candidates meet the threshold but unprepared lists never activate', () => {
  const counts = [['Philippines', 173], ['Slovakia', 139], ['Indonesia', 67], ['Bulgaria', 69], ['Cyprus', 62], ['Malaysia', 56], ['Luxembourg', 57], ['Iceland', 56], ['Azerbaijan', 54]] as const;
  assert.equal(counts.length, CAMPAIGN_MARKETS.filter(m => !m.existing).length);
  for (const [country, count] of counts) { assert.ok(count >= 50); assert.ok(CAMPAIGN_MARKETS.some(m => normalizeCampaignMarket(m.value) === normalizeCampaignMarket(country))); }
  assert.deepEqual(campaignMarketOptions(counts.map(([country, usable_email_count]) => ({ country, usable_email_count })), 'fr', {}).map(m => m.code), []);
});
test('historical markets under 50 remain selectable when their real list is ready', () => {
  const options = campaignMarketOptions([{ country: 'argentina', usable_email_count: 30 }], 'en', allReady);
  assert.ok(options.some(m => m.value === 'Argentina'));
});
test('missing, empty, stale mismatched list IDs never activate a market', () => {
  assert.equal(campaignMarketOptions([{ country: 'slovakia', usable_email_count: 139 }], 'fr', { SK: { listIds: [130], nonBlockedContacts: 29 } }).length, 0);
  assert.equal(campaignMarketOptions([{ country: 'cyprus', usable_email_count: 62 }], 'fr', { CY: { listIds: [142], nonBlockedContacts: 0 } }).length, 0);
});
test('minimum 5 markets', () => { assert.equal(MIN_CAMPAIGN_MARKETS, 5); assert.equal(campaignMarketRangeValid(['Germany','France','Italy','Spain']), false); assert.equal(campaignMarketRangeValid(['Germany','France','Italy','Spain','Canada']), true); });
test('maximum 15 markets; a sixteenth is refused', () => { assert.equal(MAX_CAMPAIGN_MARKETS, 15); assert.equal(campaignMarketRangeValid(CAMPAIGN_MARKETS.slice(0, 15).map(m => m.value)), true); assert.equal(campaignMarketRangeValid(CAMPAIGN_MARKETS.slice(0, 16).map(m => m.value)), false); });
test('aliases do not inflate the market count and raw saved values are unchanged', () => {
  const input = ['USA', 'United States', 'United\u00a0 States', 'Slovakia ', 'Slovakia'];
  assert.deepEqual(distinctCampaignMarkets(input), ['USA', 'Slovakia ']);
  assert.equal(input[3], 'Slovakia ');
  assert.equal(normalizeCampaignMarket('  Hong\u00a0\u00a0Kong '), 'hong kong');
  assert.equal(normalizeCampaignMarket('Bosnia-Herzegovina'), 'bosnia and herzegovina');
});
test('UK subdivisions, UAE and Czechia share their canonical targets', () => {
  for (const c of ['England (UK)', 'Scotland (UK)', 'Wales (UK)', 'Northern Ireland (UK)', 'UK']) assert.equal(normalizeCampaignMarket(c), 'united kingdom');
  assert.equal(normalizeCampaignMarket('UAE'), normalizeCampaignMarket('United Arab Emirates'));
  assert.equal(normalizeCampaignMarket('Czechia'), normalizeCampaignMarket('Czech Republic'));
});
test('mapping retains old IDs and resolves Canada/Portugal/Hong Kong/Bulgaria without substitutes', () => {
  assert.deepEqual(mapCampaignMarkets(['Germany','USA','United States','UK','France']).listIds, [148,175,176,147]);
  assert.deepEqual(mapCampaignMarkets(['Canada','Portugal','Hong Kong','Bulgarie']).listIds, [33,10,38,21]);
  assert.deepEqual(mapCampaignMarkets(['Philippines','UAE','Atlantis']).unmatched, ['Philippines','UAE','Atlantis']);
});
test('composite do_not_mail and abuse statuses produce no candidate email', () => {
  for (const status of ['do_not_mail | role_based', 'do_not_mail | global_suppression', 'abuse | —', 'unsubscribed']) assert.deepEqual(campaignCandidateEmails('real@example.com', status), []);
});
test('multiple emails are extracted and deduplicated; unknown does not invent validation', () => {
  assert.deepEqual(campaignCandidateEmails('A@example.com; mailto:a@EXAMPLE.com\n b@example.org invalid', 'unknown | greylisted'), ['a@example.com','b@example.org']);
  assert.deepEqual(campaignCandidateEmails('', null), []);
});
test('default rollout remains off: all original 44 and no new selections even with eligible counts', () => {
  const options = rawMarketOptions([{ country: 'slovakia', usable_email_count: 139 }], 'fr', allReady);
  assert.equal(options.length, 44);
  assert.equal(options.some(m => !m.existing), false);
});
test('saved unavailable targets remain visible to the caller without mutation', () => {
  const selected = ['USA','UAE','Philippines'];
  const options = campaignMarketOptions(null, 'fr', { US: allReady.US });
  assert.deepEqual(unavailableSelectedMarkets(selected, options), ['UAE','Philippines']);
  assert.deepEqual(selected, ['USA','UAE','Philippines']);
});
test('RPC exceptions and malformed data fail closed without throwing', async () => {
  assert.equal(await fetchCampaignMarketCounts({ rpc: async () => { throw new Error('network'); } }), null);
  assert.equal(await fetchCampaignMarketCounts({ rpc: async () => ({ data: [{ country: 'SK', usable_email_count: 'bad' }], error: null }) }), null);
  assert.deepEqual(await fetchCampaignMarketCounts({ rpc: async () => ({ data: [{ country: 'slovakia', usable_email_count: '139' }], error: null }) }), [{ country: 'slovakia', usable_email_count: 139 }]);
});