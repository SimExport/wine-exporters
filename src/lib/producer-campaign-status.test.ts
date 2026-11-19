import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
const expect = (a: unknown) => ({ toBe: (b: unknown) => assert.equal(a, b) });
import { displayCampaignStatus, formatParisSlotLong, fetchMySendSlots, toSlotMap } from './producer-campaign-status';

const roq = { campaign_id: '2f661ab9-0343-4f5c-9c4f-c0a2f17df207', state: 'queued', scheduled_at: '2026-11-20T09:00:00Z' };
describe('producer campaign status', () => {
  test('Roquefort queued => scheduled 20 Nov 10h Paris', () => {
    expect(displayCampaignStatus('pending_validation', roq)).toBe('scheduled');
    expect(formatParisSlotLong(roq.scheduled_at, 'fr')).toBe('20 novembre 2026 à 10h00');
    expect(formatParisSlotLong(roq.scheduled_at, 'en')).toBe('20 November 2026 at 10:00');
  });
  test('summer time 15h', () => expect(formatParisSlotLong('2026-07-01T13:00:00Z', 'fr')).toBe('1 juillet 2026 à 15h00'));
  test('true pending without queue stays pending', () => expect(displayCampaignStatus('pending_validation', undefined)).toBe('pending_validation'));
  test('queued without slot is not scheduled', () => expect(displayCampaignStatus('pending_validation', { ...roq, scheduled_at: null })).toBe('pending_validation'));
  test('sending', () => expect(displayCampaignStatus('pending_validation', { ...roq, state: 'sending' })).toBe('sending'));
  test('needs_review and failed never scheduled', () => {
    expect(displayCampaignStatus('pending_validation', { ...roq, state: 'needs_review' })).toBe('send_review');
    expect(displayCampaignStatus('pending_validation', { ...roq, state: 'failed' })).toBe('send_review');
  });
  test('sent/draft/results keep stored status even with a queue row', () => {
    for (const s of ['active', 'draft', 'results', 'archived']) expect(displayCampaignStatus(s, roq)).toBe(s);
  });
  test('RPC failure => empty map, no throw', async () => {
    const orig = console.error; console.error = () => {};
    const m = await fetchMySendSlots({ rpc: async () => ({ data: null, error: new Error('x') }) });
    const m2 = await fetchMySendSlots({ rpc: () => { throw new Error('net'); } } as any);
    console.error = orig;
    expect(m.size).toBe(0); expect(m2.size).toBe(0);
  });
});

import { pickCampaignCard } from './dashboard-summary';
test('dashboard card shows queued Roquefort as scheduled', () => {
  const slots = toSlotMap([{ campaign_id: 'r', state: 'queued', scheduled_at: '2026-11-20T09:00:00Z' }]);
  const camps = [{ id: 'r', name: 'Roquefort', status: 'pending_validation', target_markets: [], created_at: '2026-11-17T00:00:00Z' }] as any;
  const card = pickCampaignCard(camps.map((c: any) => ({ ...c, status: displayCampaignStatus(c.status, slots.get(c.id)) })));
  expect(card.state).toBe('scheduled');
});
