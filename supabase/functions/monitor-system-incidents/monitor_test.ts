import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { runMonitor, alertEmail, type Deps, type AlertRow, type SendResult } from './monitor.ts';
import { detect, sanitize, type Snapshot } from './policy.ts';

const NOW = Date.parse('2026-11-09T10:00:00Z');
const CID = '11111111-1111-1111-1111-111111111111';
const camp = { id: CID, name: 'Test', status: 'active', send_error: null, domain: 'Domaine Test' };
const job = (o: Record<string, unknown>) => ({ campaign_id: CID, stage: 'sync', status: 'pending', next_attempt_at: null, lease_until: null, updated_at: '2026-11-09T09:59:00Z', last_error: null, attempts: 1, ...o });
const snap = (o: Partial<Snapshot> = {}): Snapshot => ({ jobs: [], queue: [], campaigns: [camp], failedLogs: [], sentLogs: [], ...o });

// In-memory fake mirroring record_system_incident / resolve semantics. No network, no real email.
function fake(initial: Snapshot, sendResult: SendResult = 'sent') {
  const state = { snap: initial, rows: [] as any[], mails: [] as string[] };
  const deps: Deps = {
    load: async () => state.snap,
    openIncidents: async () => state.rows.filter((r) => r.status === 'open'),
    record: async (d) => {
      const ex = state.rows.find((r) => r.dedupe_key === d.key && r.status === 'open');
      if (ex) { ex.occurrences++; return { id: ex.id, inserted: false }; }
      const row = { id: `r${state.rows.length}`, dedupe_key: d.key, source: d.source, resource_id: d.resourceId, status: 'open', occurrences: 1, alert_state: d.severity === 'blocking' ? 'pending' : 'none', alert_attempts: 0, resolved_alert_state: 'none', human_title: d.title, human_message: d.message, category: d.category, resource_name: d.resourceName, first_seen_at: new Date(NOW).toISOString(), resolved_at: null };
      state.rows.push(row); return { id: row.id, inserted: true };
    },
    resolve: async (id) => { const r = state.rows.find((x) => x.id === id)!; r.status = 'resolved'; if (r.alert_state === 'sent') r.resolved_alert_state = 'pending'; },
    claimAlerts: async (kind) => {
      const s = kind === 'open' ? 'alert_state' : 'resolved_alert_state';
      const out = state.rows.filter((r) => r.status === (kind === 'open' ? 'open' : 'resolved') && ['pending', 'failed'].includes(r[s]) && r.alert_attempts < 3);
      out.forEach((r) => { r[s] = 'sending'; r.alert_attempts++; });
      return out as AlertRow[];
    },
    finishAlert: async (kind, id, result) => { state.rows.find((r) => r.id === id)![kind === 'open' ? 'alert_state' : 'resolved_alert_state'] = result; },
    sendEmail: async (kind, row) => { state.mails.push(`${kind}:${row.id}`); return { result: sendResult, error: sendResult === 'sent' ? null : 'x' }; },
  };
  return { deps, state };
}

Deno.test('A duplicate detection creates no new row and no new email', async () => {
  const { deps, state } = fake(snap({ jobs: [job({ status: 'paused' })] }));
  await runMonitor(deps, NOW); await runMonitor(deps, NOW); await runMonitor(deps, NOW);
  assertEquals(state.rows.length, 1);
  assertEquals(state.rows[0].occurrences, 3);
  assertEquals(state.mails, ['open:r0']);
});

Deno.test('Resolution needs a really finished workflow, and mails only after a sent opening', async () => {
  const { deps, state } = fake(snap({ jobs: [job({ status: 'paused' })] }));
  await runMonitor(deps, NOW);
  state.snap = snap({ jobs: [job({ status: 'pending', next_attempt_at: '2026-11-09T09:59:00Z' })] }); // resumed, not done
  await runMonitor(deps, NOW);
  assertEquals(state.rows[0].status, 'open');
  state.snap = snap({ jobs: [job({ stage: 'done', status: 'completed' })] });
  await runMonitor(deps, NOW); await runMonitor(deps, NOW);
  assertEquals(state.rows[0].status, 'resolved');
  assertEquals(state.mails, ['open:r0', 'resolved:r0']);
});

Deno.test('Warnings never email; uncertain sends are not retried', async () => {
  const w = fake(snap({ jobs: [job({ status: 'retry', updated_at: '2026-11-09T09:00:00Z' })] }));
  await runMonitor(w.deps, NOW);
  assertEquals([w.state.rows[0].alert_state, w.state.mails.length], ['none', 0]);
  const u = fake(snap({ queue: [{ campaign_id: CID, state: 'needs_review', error: 'uncertain', attempted_at: null }] }), 'uncertain');
  await runMonitor(u.deps, NOW); await runMonitor(u.deps, NOW);
  assertEquals(u.state.mails.length, 1);
});

Deno.test('Failed alerts retry at most three times without blocking detection', async () => {
  const { deps, state } = fake(snap({ jobs: [job({ status: 'paused' })] }), 'failed');
  for (let i = 0; i < 5; i++) await runMonitor(deps, NOW);
  assertEquals(state.mails.length, 3);
  assertEquals(state.rows[0].occurrences, 5);
});

Deno.test('Detection thresholds', () => {
  const k = (s: Snapshot) => detect(s, NOW).map((d) => `${d.key.split(':')[2]}/${d.severity}`);
  assertEquals(k(snap({ jobs: [job({ status: 'retry', updated_at: '2026-11-09T09:45:00Z' })] })), []);
  assertEquals(k(snap({ jobs: [job({ status: 'processing', lease_until: '2026-11-09T09:40:00Z' })] })), ['stalled/blocking']);
  assertEquals(k(snap({ jobs: [job({ status: 'processing', lease_until: '2026-11-09T09:50:00Z' })] })), []);
  assertEquals(k(snap({ jobs: [job({ status: 'pending', next_attempt_at: '2026-11-09T08:30:00Z' })] })), ['queue_stuck/blocking']);
  assertEquals(k(snap({ jobs: [job({ stage: 'done', status: 'completed' })] })), []);
  assertEquals(k(snap({ queue: [{ campaign_id: CID, state: 'queued', error: null, attempted_at: null }] })), []);
  assertEquals(k(snap({ campaigns: [{ ...camp, status: 'failed', send_error: 'boom' }] })), ['send_error/blocking']);
});

Deno.test('Technical text and emails never leak addresses or keys', () => {
  assertEquals(sanitize('fail for jean@ex.com api_key=abc123 re_ABCDEFGHIJKLMNOP'), 'fail for [email] api_key [masqué] [masqué]');
  const mail = alertEmail('open', { id: 'x', human_title: 'T', human_message: 'M', category: 'C', resource_name: null, first_seen_at: '2026-11-09T10:00:00Z', resolved_at: null });
  assertEquals(mail.html.includes('@'), false);
});
