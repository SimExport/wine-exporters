import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { pickCampaignCard, isSubmittedCampaign, summarizePipeline, countActiveOpportunities, isProfileComplete, isTenderClosed, type DashboardCampaign } from './dashboard-summary';

const c = (id: string, status: string, created_at = '2026-10-01T00:00:00Z'): DashboardCampaign =>
  ({ id, name: id, status, target_markets: [], launched_at: null, created_at });

test('pending validation campaign is shown instead of "no active campaign"', () => {
  assert.equal(pickCampaignCard([c('d', 'draft'), c('p', 'pending_validation')]).state, 'pending_validation');
});
test('latest results shown when nothing is in progress', () => {
  const r = pickCampaignCard([c('old', 'results', '2026-01-01T00:00:00Z'), c('new', 'results', '2026-09-01T00:00:00Z'), c('m', 'manual')]);
  assert.equal(r.state, 'results');
  assert.equal(r.campaign?.id, 'new');
});
test('in-flight beats results; newest in-flight wins; drafts/manual alone give none', () => {
  assert.equal(pickCampaignCard([c('r', 'results', '2026-10-05T00:00:00Z'), c('a', 'active')]).state, 'active');
  const r = pickCampaignCard([c('a', 'active', '2026-09-01T00:00:00Z'), c('p', 'pending_validation', '2026-10-20T00:00:00Z')]);
  assert.equal(r.campaign?.id, 'p');
  assert.equal(pickCampaignCard([c('d', 'draft'), c('m', 'manual')]).state, 'none');
});
test('draft and manual containers are never submitted campaigns', () => {
  assert.equal(isSubmittedCampaign({ status: 'draft' }), false);
  assert.equal(isSubmittedCampaign({ status: 'manual' }), false);
  assert.equal(isSubmittedCampaign({ status: 'archived', validation_requested_at: null }), false);
  assert.equal(isSubmittedCampaign({ status: 'pending_validation' }), true);
  assert.equal(isSubmittedCampaign({ status: 'results' }), true);
});
test('pipeline: new = new prospects, sample steps grouped, won counted, open excludes won/lost', () => {
  assert.deepEqual(summarizePipeline(['new', 'new', 'samples_sent', 'tasted', 'negotiation', 'won', 'lost', null]),
    { newProspects: 2, samples: 2, negotiation: 1, won: 1, open: 6 });
});
test('tenders with a past answer deadline are excluded from active opportunities', () => {
  const now = new Date('2026-11-01T10:00:00Z');
  assert.equal(countActiveOpportunities(5, ['2026-10-20', '2026-12-01', null, '2026-11-01'], now), 8);
});
test('profile complete requires the four banner fields', () => {
  assert.equal(isProfileComplete({ domain_name: 'D', contact_name: 'C', location: 'L', priority_markets: null }), false);
  assert.equal(isProfileComplete({ domain_name: 'D', contact_name: 'C', location: 'L', priority_markets: 'US' }), true);
});

test('tender deadline: today open, yesterday closed (local day)', () => {
  const now = new Date(2026, 10, 1, 23, 30);
  assert.equal(isTenderClosed('2026-11-01', now), false);
  assert.equal(isTenderClosed('2026-10-31', now), true);
  assert.equal(isTenderClosed(null, now), false);
});
