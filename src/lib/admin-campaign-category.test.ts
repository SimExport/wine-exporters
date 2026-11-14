import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adminCategory, countByCategory, queuePosition } from './admin-campaign-category';

const pending = { status: 'pending_validation' };
const q = (state: string, approved_at = '2026-01-01') => ({ campaign_id: 'x', state, approved_at });

test('pending without queue row is to review', () => assert.equal(adminCategory(pending, null), 'to_review'));
test('failed scheduling stays to review', () => assert.equal(adminCategory(pending, q('failed')), 'to_review'));
test('needs_review is to check', () => assert.equal(adminCategory(pending, q('needs_review')), 'to_check'));
test('queued is scheduled', () => assert.equal(adminCategory(pending, q('queued')), 'scheduled'));
test('sending is scheduled', () => assert.equal(adminCategory(pending, q('sending')), 'scheduled'));
test('uncertain Brevo send is to check', () => assert.equal(adminCategory({ ...pending, send_error: 'uncertain' }, null), 'to_check'));
test('active and results are sent', () => {
  assert.equal(adminCategory({ status: 'active' }, q('sent')), 'sent');
  assert.equal(adminCategory({ status: 'results' }, null), 'sent');
});
test('draft is other', () => assert.equal(adminCategory({ status: 'draft' }, null), 'other'));
test('counts sum to total', () => {
  const rows = [{ id: 'a', ...pending }, { id: 'b', ...pending }, { id: 'c', status: 'results' }];
  const c = countByCategory(rows, { b: { ...q('queued'), campaign_id: 'b' } });
  assert.deepEqual(c, { to_review: 1, to_check: 0, scheduled: 1, sent: 1, other: 0 });
});
test('queue position follows FIFO', () => {
  const queue = { a: { campaign_id: 'a', state: 'queued', approved_at: '2026-01-02' }, b: { campaign_id: 'b', state: 'queued', approved_at: '2026-01-01' } };
  assert.equal(queuePosition('a', queue), 2);
  assert.equal(queuePosition('b', queue), 1);
});
