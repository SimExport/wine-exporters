import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { canGenerateCampaignEmail, MAX_EMAIL_GENERATIONS } from '../../supabase/functions/_shared/campaign-generation-policy';

test('one generation per email: unused allowed, used and historical counts blocked', () => {
  assert.equal(MAX_EMAIL_GENERATIONS, 1);
  assert.equal(canGenerateCampaignEmail(0), true);
  assert.equal(canGenerateCampaignEmail(null), true);
  assert.equal(canGenerateCampaignEmail(1), false);
  assert.equal(canGenerateCampaignEmail(10), false);
});
import { adminPendingEmailBlock } from '../../supabase/functions/_shared/campaign-generation-policy';
const legacy = { status: 'pending_validation', send_started_at: null, brevo_campaign_id: null, email_content: null, message_html: null };
const ok = { isAdmin: true, isTest: false, queueState: null };
test('admin can prepare a pending legacy campaign; producer cannot', () => {
  assert.equal(adminPendingEmailBlock(legacy, ok, 'prepare'), null);
  assert.equal(adminPendingEmailBlock(legacy, { ...ok, isAdmin: false }, 'prepare'), 'admin_only');
});
test('prepare refused: draft/active, test, lock, Brevo id, queued, existing content', () => {
  assert.equal(adminPendingEmailBlock({ ...legacy, status: 'draft' }, ok, 'prepare'), 'not_pending');
  assert.equal(adminPendingEmailBlock({ ...legacy, status: 'active' }, ok, 'prepare'), 'not_pending');
  assert.equal(adminPendingEmailBlock(legacy, { ...ok, isTest: true }, 'prepare'), 'test_campaign');
  assert.equal(adminPendingEmailBlock({ ...legacy, send_started_at: '2026-10-29' }, ok, 'prepare'), 'send_locked');
  assert.equal(adminPendingEmailBlock({ ...legacy, brevo_campaign_id: 12 }, ok, 'prepare'), 'send_locked');
  assert.equal(adminPendingEmailBlock(legacy, { ...ok, queueState: 'queued' }, 'prepare'), 'already_queued');
  assert.equal(adminPendingEmailBlock({ ...legacy, message_html: '<p>old</p>' }, ok, 'prepare'), 'email_exists');
  assert.equal(adminPendingEmailBlock({ ...legacy, email_content: { version: 2 }, message_html: '<p>x</p>' }, ok, 'prepare'), 'email_exists');
});
test('manual admin edit only once a v2 email exists, never while queued', () => {
  const v2 = { ...legacy, email_content: { version: 2 }, message_html: '<p>x</p>' };
  assert.equal(adminPendingEmailBlock(legacy, ok, 'edit'), 'no_email');
  assert.equal(adminPendingEmailBlock(v2, ok, 'edit'), null);
  assert.equal(adminPendingEmailBlock(v2, { ...ok, queueState: 'queued' }, 'edit'), 'already_queued');
});
