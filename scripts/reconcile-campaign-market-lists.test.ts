import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { collectMarketContacts, contactImportDecision, auditMarketList } from './reconcile-campaign-market-lists';
import { CAMPAIGN_MARKETS } from '../supabase/functions/_shared/campaign-markets';
test('reconciliation never reactivates an existing blocked or indeterminate contact', () => {
  assert.equal(contactImportDecision({ emailBlacklisted: true }, 'Estate').action, 'skip');
  assert.equal(contactImportDecision({}, 'Estate').action, 'skip');
});
test('imports keep known company attributes and never invent a company', () => {
  assert.deepEqual(contactImportDecision({ emailBlacklisted: false, attributes: { COMPANY_NAME: 'Kept' } }, 'Other').attributes, {});
  assert.deepEqual(contactImportDecision(null, null).attributes, {});
  assert.deepEqual(contactImportDecision(null, 'Real estate').attributes, { COMPANY_NAME: 'Real estate' });
});
test('raw aliases and duplicated emails produce one import item; do_not_mail never returns', () => {
  const rows = [{ country: 'Slovakia ', email: 'A@example.org', company_name: 'Real' }, { country: 'Slovakia', email: 'a@example.org' }, { country: 'Slovakia', email: 'blocked@example.org', email_status: 'do_not_mail | role_based' }];
  assert.deepEqual([...collectMarketContacts(rows, 'Slovakia')], [['a@example.org','Real']]);
});
test('read-only readiness counts non-blacklisted addresses, not uniqueSubscribers', async () => {
  const m = CAMPAIGN_MARKETS.find(m => m.code === 'CY'); assert.ok(m);
  const r = await auditMarketList(m, async path => path.endsWith('/142') ? { id: 142, name: 'Cyprus', uniqueSubscribers: 3 } : { contacts: [{ email: 'a@example.org', emailBlacklisted: true }] });
  assert.equal(r.nonBlockedContacts, 0);
});
test('Slovakia 75 + 65 historic rows produce 139 distinct addresses across aliases', () => {
  const rows = [...Array.from({ length: 75 }, (_, i) => ({ country: 'Slovakia ', email: `a${i}@example.org` })), ...Array.from({ length: 65 }, (_, i) => ({ country: 'Slovakia', email: i === 0 ? 'a0@example.org' : `b${i}@example.org` }))];
  assert.equal(rows.length, 140);
  assert.equal(collectMarketContacts(rows, 'Slovakia').size, 139);
});