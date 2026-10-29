import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { handler } from './index.ts';

async function simulate(options: { stage: string; locked?: boolean; failure?: number; remaining?: number; historical?: boolean }) {
  const savedFetch = globalThis.fetch;
  const names = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CAMPAIGN_RESULTS_INTERNAL_SECRET'];
  const previous = names.map((name) => Deno.env.get(name));
  Deno.env.set('SUPABASE_URL', 'https://mock.invalid');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'unit-test-only');
  Deno.env.set('CAMPAIGN_RESULTS_INTERNAL_SECRET', 'unit-test-only');
  const id = '00000000-0000-0000-0000-000000000001';
  const job = { campaign_id: id, stage: options.stage, status: 'pending', lease_token: 'mock-lease', notification_state: 'pending' };
  const operations: string[] = [];
  const writes: Record<string, unknown>[] = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const response = (value: unknown, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', ...headers } });
    if (url.pathname.includes('/functions/v1/')) {
      operations.push(url.pathname.split('/').pop() ?? '');
      return response(options.failure ? { error: 'Mock provider failure' } : { ok: true, remaining: options.remaining ?? 0 }, options.failure ?? 200);
    }
    if (url.pathname.endsWith('/rpc/is_test_campaign')) return response(false);
    if (url.pathname.endsWith('/rpc/claim_campaign_result_job')) return response(options.locked ? [] : [job]);
    if (url.pathname.endsWith('/rpc/dispatch_campaign_results')) return response(null);
    if (url.pathname.endsWith('/campaign_interested_contacts')) return new Response(null, { status: 200, headers: { 'content-range': '*/0' } });
    if (url.pathname.endsWith('/campaigns')) {
      if (method === 'PATCH') { operations.push('publish-results'); return response([{ id }]); }
      return response({ id, status: options.historical ? 'results' : 'active', launched_at: '2026-10-27T08:55:00Z', brevo_campaign_id: 123 });
    }
    if (url.pathname.endsWith('/campaign_result_jobs')) {
      if (method === 'PATCH') { writes.push(body); return response([]); }
      return response(options.historical ? null : job);
    }
    throw new Error('Unexpected mocked request');
  };
  try {
    const request = new Request('https://mock.invalid/process', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-campaign-results-secret': 'unit-test-only' }, body: JSON.stringify({ campaign_id: id }) });
    const response = await handler(request);
    return { status: response.status, body: await response.json(), operations, writes };
  } finally {
    globalThis.fetch = savedFetch;
    names.forEach((name, i) => previous[i] === undefined ? Deno.env.delete(name) : Deno.env.set(name, previous[i] ?? ''));
  }
}
Deno.test('Mock worker: competing lease exits with no calls or writes', async () => {
  const result = await simulate({ stage: 'enrich', locked: true });
  assertEquals(result.operations, []);
  assertEquals(result.writes, []);
  assertEquals(result.body.reason, 'locked_or_paused');
});
Deno.test('Mock worker: remaining contacts resume by persisted stage without publication', async () => {
  const result = await simulate({ stage: 'enrich', remaining: 29 });
  assertEquals(result.operations, ['enrich-campaign-prospects']);
  assertEquals(result.writes[0].stage, 'enrich');
  assertEquals(result.writes[0].status, 'pending');
});
Deno.test('Mock worker: denial pauses, never publishes or notifies', async () => {
  const result = await simulate({ stage: 'enrich', failure: 403 });
  assertEquals(result.status, 403);
  assertEquals(result.operations, ['enrich-campaign-prospects']);
  assertEquals(result.writes[0].status, 'paused');
});
Deno.test('Mock worker: results transition precedes notification and completion', async () => {
  const result = await simulate({ stage: 'notify' });
  assertEquals(result.operations, ['publish-results', 'notify-campaign-completed']);
  assertEquals(result.writes[0].status, 'completed');
});
Deno.test('Mock worker: old results without a job are never touched', async () => {
  const result = await simulate({ stage: 'notify', historical: true });
  assertEquals(result.operations, []);
  assertEquals(result.writes, []);
  assertEquals(result.body.reason, 'not_eligible');
});