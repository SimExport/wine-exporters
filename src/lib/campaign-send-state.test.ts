import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { campaignPath, canStartSend, needsBrevoCheck, sendState } from './campaign-send-state';

const custom = { status: 'pending_validation', email_content: { version: 2 }, message_html: '<html>x</html>' };

describe('campaign path', () => {
  test('legacy when no v2 content, even with HTML', () => {
    assert.equal(campaignPath({ message_html: '<p>x</p>' }), 'legacy');
    assert.equal(campaignPath({ email_content: { version: 2 }, message_html: '' }), 'legacy');
    assert.equal(campaignPath(custom), 'custom');
  });
});

describe('send state', () => {
  test('fresh custom campaign can be sent', () => assert.equal(canStartSend(custom), true));
  test('lock without Brevo id blocks a new send and requires a check', () => {
    const c = { ...custom, send_started_at: '2026-10-22' };
    assert.equal(canStartSend(c), false);
    assert.equal(needsBrevoCheck(c), true);
  });
  test('uncertain timeout never allows a new send', () => {
    const c = { ...custom, send_started_at: 'x', send_error: 'uncertain' };
    assert.equal(sendState(c), 'uncertain');
    assert.equal(canStartSend(c), false);
  });
  test('Brevo id saved means uncertain even without error', () => {
    assert.equal(sendState({ ...custom, brevo_campaign_id: 12 }), 'uncertain');
  });
  test('definite Brevo refusal allows a retry', () => {
    const c = { ...custom, send_error: 'brevo_create 400' };
    assert.equal(sendState(c), 'failed');
    assert.equal(canStartSend(c), true);
  });
  test('legacy pending campaign is never sent by the new path', () => {
    assert.equal(canStartSend({ status: 'pending_validation' }), false);
  });
});
