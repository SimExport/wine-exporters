import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { CAMPAIGN_MARKETS, CAMPAIGN_MARKET_GROUPS, MIN_CAMPAIGN_MARKETS, MAX_CAMPAIGN_MARKETS, MIN_CAMPAIGN_EMAILS, normalizeCampaignMarket, distinctCampaignMarkets, campaignMarketRangeValid, mapCampaignMarkets, campaignCandidateEmails } from '../../supabase/functions/_shared/campaign-markets';
import { campaignMarketPreflight } from '../../supabase/functions/_shared/campaign-market-preflight';
import { campaignMarketOptions, fetchCampaignMarketCounts, unavailableSelectedMarkets, blockedSelectedMarkets, campaignMarketLabel, campaignMarketFlag } from './campaign-markets';
import type { MarketReadiness } from '../../supabase/functions/_shared/campaign-market-readiness';

const original = ['Austria','Belgium','Croatia','Czech Republic','Denmark','Estonia','Finland','Germany','Greece','Hungary','Ireland','Italy','Netherlands','Norway','Poland','Portugal','Romania','Serbia','Spain','Sweden','Switzerland','United Kingdom','Canada','Mexico','United States','Argentina','Brazil','Chile','Colombia','Peru','China','Hong Kong','India','Japan','Singapore','South Korea','Taiwan','Thailand','UAE','Vietnam','Australia','Morocco','Nigeria','South Africa'];
const requested = ['Philippines','Slovakia','Indonesia','Bulgaria','Cyprus','Malaysia','Luxembourg','Iceland','Azerbaijan','Slovenia','Malta','Lithuania','Latvia','New Zealand','Israel','Cambodia','Albania','Costa Rica','Puerto Rico','Kenya','Ecuador','Uruguay','Dominican Republic','Turkey','Montenegro','Panama','Mauritius','Kazakhstan','Seychelles','Maldives','Macau','Guatemala','Ukraine','Armenia','Lebanon','Bosnia and Herzegovina','North Macedonia','Jamaica','Bahrain','Jordan','French Polynesia','New Caledonia','Andorra','San Marino','Namibia','Paraguay','El Salvador','Honduras','Fiji','Nicaragua','Curacao','Aruba','Ghana','Senegal','Tanzania','Bahamas','Barbados','Trinidad and Tobago'];
const allReady: Record<string, MarketReadiness> = Object.fromEntries(CAMPAIGN_MARKETS.map(m => [m.code, { listIds: [...m.listIds], nonBlockedContacts: 100 }]));

test('retains all 44 historical values in their original order', () => {
  assert.deepEqual(CAMPAIGN_MARKETS.filter(m => m.existing).map(m => m.value), original);
});
test('adds exactly the 58 requested markets without duplicate values or codes', () => {
  assert.equal(requested.length, 58);
  assert.deepEqual(CAMPAIGN_MARKETS.filter(m => !m.existing).map(m => m.value), requested);
  assert.equal(CAMPAIGN_MARKETS.length, 102);
  assert.equal(new Set(CAMPAIGN_MARKETS.map(m => m.code)).size, 102);
  assert.equal(new Set(CAMPAIGN_MARKETS.map(m => normalizeCampaignMarket(m.value))).size, 102);
});
test('keeps geographical grouping and separates Africa, Oceania and Middle East', () => {
  assert.deepEqual([...CAMPAIGN_MARKET_GROUPS], ['europe','northAmerica','latinAmerica','asia','middleEast','africa','oceania']);
  assert.equal(CAMPAIGN_MARKETS.find(m => m.code === 'KE')?.group, 'africa');
  assert.equal(CAMPAIGN_MARKETS.find(m => m.code === 'NZ')?.group, 'oceania');
  assert.equal(CAMPAIGN_MARKETS.find(m => m.code === 'IL')?.group, 'middleEast');
});
test('draft chooser contains 102 markets even with no aggregate or audience available', () => {
  const options = campaignMarketOptions(null, 'fr', {});
  assert.equal(options.length, 102);
  assert.ok(options.filter(m => !m.existing).every(m => m.sendBlockReason !== null));
});
test('approved niches below 50 are not filtered out', () => {
  assert.equal(MIN_CAMPAIGN_EMAILS, 1);
  for (const usable_email_count of [1, 4, 49]) {
    const m = campaignMarketOptions([{ country: 'Malta', usable_email_count }], 'fr', allReady, true, true).find(m => m.code === 'MT');
    assert.equal(m?.sendBlockReason, null);
  }
});
test('an empty candidate aggregate never proves a new audience ready', () => {
  const m = campaignMarketOptions([{ country: 'Malta', usable_email_count: 0 }], 'en', allReady, true, true).find(m => m.code === 'MT');
  assert.equal(m?.sendBlockReason, 'no_contacts');
});
test('missing list remains selectable in draft but is flagged as blocked for sending', () => {
  const options = campaignMarketOptions([{ country: 'Philippines', usable_email_count: 173 }], 'fr', allReady);
  assert.equal(options.find(m => m.code === 'PH')?.sendBlockReason, 'missing_list');
  assert.deepEqual(blockedSelectedMarkets(['Philippines'], options).map(m => m.code), ['PH']);
});
test('empty and mismatched lists are not presented as ready', () => {
  const options = campaignMarketOptions(null, 'fr', { CY: { listIds: [142], nonBlockedContacts: 0 }, SK: { listIds: [130], nonBlockedContacts: 29 } });
  assert.equal(options.find(m => m.code === 'CY')?.sendBlockReason, 'no_audience');
  assert.equal(options.find(m => m.code === 'SK')?.sendBlockReason, 'unverified');
});
test('preview approval does not enable sending new countries even with a real audience', () => {
  const options = campaignMarketOptions([{ country: 'Slovakia ', usable_email_count: 139 }], 'fr', allReady);
  assert.equal(options.find(m => m.code === 'SK')?.sendBlockReason, 'sender_update_required');
});
test('minimum remains 5; 4 is refused', () => {
  assert.equal(MIN_CAMPAIGN_MARKETS, 5);
  assert.equal(campaignMarketRangeValid(original.slice(0, 4)), false);
  assert.equal(campaignMarketRangeValid(original.slice(0, 5)), true);
});
test('maximum is 20 and exactly 20 is accepted', () => {
  assert.equal(MAX_CAMPAIGN_MARKETS, 20);
  assert.equal(campaignMarketRangeValid(original.slice(0, 20)), true);
});
test('21 markets is refused', () => {
  assert.equal(campaignMarketRangeValid(original.slice(0, 21)), false);
});
test('new markets participate in the same 5 to 20 selection rule', () => {
  assert.equal(campaignMarketRangeValid(requested.slice(0, 5)), true);
  assert.equal(campaignMarketRangeValid(requested.slice(0, 20)), true);
  assert.equal(campaignMarketRangeValid(requested.slice(0, 21)), false);
});
test('aliases do not inflate counts and stored values are never mutated', () => {
  const input = ['USA', 'United States', 'United\u00a0 States', 'Slovakia ', 'Slovakia'];
  const before = [...input];
  assert.deepEqual(distinctCampaignMarkets(input), ['USA', 'Slovakia ']);
  assert.deepEqual(input, before);
  assert.equal(normalizeCampaignMarket('  Hong\u00a0\u00a0Kong '), 'hong kong');
  assert.equal(normalizeCampaignMarket('Bosnia-Herzegovina'), 'bosnia and herzegovina');
});
test('bare and UK-suffixed UK subdivisions resolve to one target', () => {
  for (const c of ['England','Scotland','Wales','Northern Ireland','England (UK)', 'Scotland (UK)', 'Wales (UK)', 'Northern Ireland (UK)', 'UK']) assert.equal(normalizeCampaignMarket(c), 'united kingdom');
  assert.deepEqual(mapCampaignMarkets(['England','Scotland','Wales','Northern Ireland']).listIds, [176]);
});
test('UAE, Bosnia spelling, Macau, Turkey and Curacao resolve without rewriting data', () => {
  assert.equal(normalizeCampaignMarket('UAE'), normalizeCampaignMarket('United Arab Emirates'));
  for (const c of ['Bosnia-Herzegovina','Bosnia–Herzegovina','Bosnia & Herzegovina','Bosnia and Hercegovina']) assert.equal(normalizeCampaignMarket(c), 'bosnia and herzegovina');
  assert.equal(normalizeCampaignMarket('Macao  '), 'macau');
  assert.equal(normalizeCampaignMarket('Türkiye'), 'turkey');
  assert.equal(normalizeCampaignMarket('Curaçao'), 'curacao');
});
test('FR and EN labels are resolved for every new ISO country, with the same stored value', () => {
  const fr = campaignMarketOptions(null, 'fr'); const en = campaignMarketOptions(null, 'en');
  assert.deepEqual(fr.map(m => m.value), en.map(m => m.value));
  assert.equal(campaignMarketLabel('Slovakia', 'fr'), 'Slovaquie');
  assert.equal(campaignMarketLabel('Slovakia', 'en'), 'Slovakia');
  for (const m of fr.filter(m => !m.existing)) assert.equal(m.flag, campaignMarketFlag(m.code));
});
test('mapping retains historical IDs including no-longer-selectable legacy campaigns', () => {
  assert.deepEqual(mapCampaignMarkets(['Germany','USA','United States','UK','France','Russia']).listIds, [148,175,176,147,164]);
  assert.deepEqual(mapCampaignMarkets(['Canada','Portugal','Hong Kong','Bulgarie']).listIds, [33,10,38,21]);
});
test('new country mappings use only verified lists; no substitute is invented', () => {
  assert.deepEqual(mapCampaignMarkets(['Malta','Lithuania','Latvia']).listIds, [158,156,155]);
  assert.deepEqual(mapCampaignMarkets(['Philippines','UAE','Bosnia-Herzegovina','Atlantis']).unmatched, ['Philippines','UAE','Bosnia-Herzegovina','Atlantis']);
});
test('countries outside the approved catalogue are not added by their raw database count', () => {
  const options = campaignMarketOptions([{ country: 'Russia', usable_email_count: 34 }, { country: 'Belarus', usable_email_count: 26 }], 'en');
  assert.equal(options.some(m => m.value === 'Russia' || m.value === 'Belarus'), false);
});
test('saved unavailable targets stay visible to caller without mutation', () => {
  const selected = ['USA','UAE','Philippines','France']; const before = [...selected];
  const options = campaignMarketOptions(null, 'fr', { US: allReady.US });
  assert.deepEqual(unavailableSelectedMarkets(selected, options), ['France']);
  assert.deepEqual(blockedSelectedMarkets(selected, options).map(m => m.value), ['UAE','Philippines']);
  assert.deepEqual(selected, before);
});
test('do_not_mail and provider suppression statuses never produce candidate email', () => {
  for (const status of ['do_not_mail | role_based', 'do_not_mail | global_suppression', 'abuse | —', 'unsubscribed','suppressed','hard_bounce']) assert.deepEqual(campaignCandidateEmails('real@example.com', status), []);
});
test('multiple emails are extracted and deduplicated without inventing validation', () => {
  assert.deepEqual(campaignCandidateEmails('A@example.com; mailto:a@EXAMPLE.com\n b@example.org invalid', 'unknown | greylisted'), ['a@example.com','b@example.org']);
  assert.deepEqual(campaignCandidateEmails('', null), []);
});
test('RPC exceptions and malformed data return null without crashing', async () => {
  assert.equal(await fetchCampaignMarketCounts({ rpc: async () => { throw new Error('network'); } }), null);
  assert.equal(await fetchCampaignMarketCounts({ rpc: async () => ({ data: [{ country: 'SK', usable_email_count: 'bad' }], error: null }) }), null);
  assert.deepEqual(await fetchCampaignMarketCounts({ rpc: async () => ({ data: [{ country: 'slovakia', usable_email_count: '139' }], error: null }) }), [{ country: 'slovakia', usable_email_count: 139 }]);
});
test('missing new market blocks targeting before any provider call', async () => {
  let reads = 0;
  const r = await campaignMarketPreflight(['Germany','Philippines'], async () => { reads++; return new Response('{}'); });
  assert.equal(r.failure?.status, 422); assert.deepEqual(r.listIds, []); assert.equal(reads, 0);
});
test('mapped niche keeps historical targeting semantics with mocked Brevo', async () => {
  const r = await campaignMarketPreflight(['Malta'], async p => Response.json(p.includes('/contacts?') ? { contacts: [{ email: 'buyer@example.org', emailBlacklisted: false }] } : { id: 158, name: 'Malta' }));
  assert.equal(r.failure, undefined); assert.deepEqual(r.listIds, [158]);
});
test('twenty historical countries resolve to their twenty actual audiences with mocked Brevo', async () => {
  const selected = original.slice(0,20);
  const ids = mapCampaignMarkets(selected).listIds;
  const r = await campaignMarketPreflight(selected, async path => {
    if (path.includes('/contacts?')) return Response.json({ contacts: [{ email: 'buyer@example.org', emailBlacklisted: false }] });
    const id = Number(path.split('/').at(-1)); const country = CAMPAIGN_MARKETS.find(m => m.listIds.includes(id));
    return Response.json({ id, name: country?.value });
  });
  assert.equal(r.failure, undefined); assert.deepEqual(r.listIds, ids); assert.equal(ids.length, 20);
});
