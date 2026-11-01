import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPriorityActions, pickQualifiedProspects, leadDisplayName, type ActionLead, type InterestedContact } from './dashboard-actions';

const now = new Date(2026, 10, 1, 9, 0); // 1 Nov 2026 09:00 local
const L = (id: string, o: Partial<ActionLead> = {}): ActionLead => ({
  id, company_name: id, first_name: null, last_name: null, country: null, prospect_status: 'new',
  archived_at: null, remind_at: null, remind_note: null, next_action: null, next_action_at: null, ...o,
});

test('new leads without any date are never priority actions', () => {
  assert.equal(getPriorityActions([L('a'), L('b')], now).length, 0);
});
test('both dates due on one lead give a single line, reminder note preferred', () => {
  const r = getPriorityActions([L('a', { remind_at: new Date(2026, 9, 30).toISOString(), remind_note: 'Rappeler', next_action_at: '2026-11-01', next_action: 'Envoyer tarifs' })], now);
  assert.equal(r.length, 1);
  assert.equal(r[0].note, 'Rappeler');
  assert.equal(r[0].when, 'overdue');
});
test('empty reminder note falls back to next action text; no text stays null', () => {
  assert.equal(getPriorityActions([L('a', { remind_at: new Date(2026, 9, 30).toISOString(), remind_note: ' ', next_action_at: '2026-11-01', next_action: 'Tarifs' })], now)[0].note, 'Tarifs');
  assert.equal(getPriorityActions([L('a', { next_action_at: '2026-11-01' })], now)[0].note, null);
});
test('won, lost and archived leads are excluded', () => {
  const due = { next_action_at: '2026-10-01' };
  assert.equal(getPriorityActions([L('w', { ...due, prospect_status: 'won' }), L('l', { ...due, prospect_status: 'lost' }), L('x', { ...due, archived_at: '2026-10-02T00:00:00Z' })], now).length, 0);
});
test('DATE next_action_at uses local day: today = today, tomorrow excluded, yesterday overdue', () => {
  const late = new Date(2026, 10, 1, 23, 30);
  const r = getPriorityActions([L('t', { next_action_at: '2026-11-01' }), L('f', { next_action_at: '2026-11-02' }), L('y', { next_action_at: '2026-10-31' })], late);
  assert.deepEqual(r.map((a) => [a.lead.id, a.when]), [['y', 'overdue'], ['t', 'today']]);
});
test('future reminder later today is not due; earlier today is "today", not overdue', () => {
  assert.equal(getPriorityActions([L('a', { remind_at: new Date(2026, 10, 1, 15).toISOString() })], now).length, 0);
  assert.equal(getPriorityActions([L('a', { remind_at: new Date(2026, 10, 1, 8).toISOString() })], now)[0].when, 'today');
});
test('display name falls back to person name, never invented', () => {
  assert.equal(leadDisplayName({ company_name: null, first_name: 'Ana', last_name: 'Lee' }), 'Ana Lee');
  assert.equal(leadDisplayName({ company_name: ' ', first_name: null, last_name: null }), null);
});

const C = (id: string, o: Partial<InterestedContact> = {}): InterestedContact => ({
  id, campaign_id: 'res', company_name: id, country: 'NL', score: 8, origin: 'form', description: 'Importateur', created_at: '2026-10-01T00:00:00Z', ...o,
});
test('qualified prospects: results campaigns only, score >= 6, description, click/form kept distinct', () => {
  const r = pickQualifiedProspects([
    C('ok-form'), C('ok-click', { origin: 'click', created_at: '2026-10-05T00:00:00Z' }),
    C('active', { campaign_id: 'act' }), C('low', { score: 5 }), C('nodesc', { description: '  ' }), C('other', { origin: 'manual' }),
  ], new Set(['res']));
  assert.deepEqual(r.map((c) => [c.id, c.origin]), [['ok-click', 'click'], ['ok-form', 'form']]);
});
test('user without results campaigns gets no prospects; max 3', () => {
  assert.equal(pickQualifiedProspects([C('a')], new Set()).length, 0);
  assert.equal(pickQualifiedProspects([C('a'), C('b'), C('c'), C('d')], new Set(['res'])).length, 3);
});
