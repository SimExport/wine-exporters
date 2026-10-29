import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { eligibleCampaign, nextResultStage, resultFailureStatus } from '../_shared/campaign-results-policy.ts';
import { matchesInternalSecret } from '../_shared/campaign-results-auth.ts';
const now = Date.parse('2026-10-29T08:55:00Z');
const active = { status: 'active', launched_at: '2026-10-27T08:55:00Z', brevo_campaign_id: 123 };
Deno.test('Exactly 48 hours is eligible, one second younger is not', () => {
  assertEquals(eligibleCampaign(active, false, now), true);
  assertEquals(eligibleCampaign(active, false, now - 1000), false);
});
Deno.test('Historic results, tests and campaigns without Brevo are excluded', () => {
  assertEquals(eligibleCampaign({ ...active, status: 'results' }, false, now), false);
  assertEquals(eligibleCampaign(active, true, now), false);
  assertEquals(eligibleCampaign({ ...active, brevo_campaign_id: null }, false, now), false);
});
Deno.test('Internal authorization rejects missing or forged credentials', () => {
  assertEquals(matchesInternalSecret(null, 'mock-key'), false);
  assertEquals(matchesInternalSecret('forged', 'mock-key'), false);
  assertEquals(matchesInternalSecret('mock-key', 'mock-key'), true);
});
Deno.test('Brevo pending never advances, all enrichment batches finish before notification', () => {
  assertEquals(nextResultStage('sync', { pending: true }), 'sync');
  assertEquals(nextResultStage('sync', { ok: true }), 'enrich');
  for (let remaining = 49; remaining > 0; remaining--) assertEquals(nextResultStage('enrich', { remaining }), 'enrich');
  assertEquals(nextResultStage('enrich', { remaining: 0 }), 'notify');
  assertEquals(nextResultStage('notify', { ok: true }), 'done');
});
Deno.test('Failures cannot publish and denied providers pause instead of retry', () => {
  assertThrows(() => nextResultStage('enrich', { failed: 1 }));
  assertThrows(() => nextResultStage('sync', { skipped: true }));
  for (const status of [401, 402, 403, 422]) assertEquals(resultFailureStatus(status, 'failure'), 'paused');
  assertEquals(resultFailureStatus(429, 'rate limit'), 'retry');
  assertEquals(resultFailureStatus(500, 'network'), 'retry');
  assertEquals(resultFailureStatus(500, 'reconciliation required'), 'paused');
});