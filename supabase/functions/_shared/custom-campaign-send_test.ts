import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { sendCustomCampaign } from './custom-campaign-send.ts';
const id = '11111111-1111-1111-1111-111111111111';
function fixture(markets: string[], behavior: 'ok' | 'empty' | 'deleted' | 'network' | 'uncertain' = 'ok') {
  const writes: { table: string; patch: Record<string, unknown> }[] = [];
  const calls: { path: string; method: string; body?: Record<string, unknown> }[] = [];
  let locked = false;
  const admin = {
    from(table: string) {
      let patch: Record<string, unknown> = {};
      let select = false;
      const query = {
        update(value: Record<string, unknown>) { patch = value; return query; },
        insert(value: Record<string, unknown>) { patch = value; return query; },
        eq() { return query; }, is() { return query; },
        select() { select = true; return query; },
        then(resolve: (value: unknown) => unknown) {
          if (select && 'send_started_at' in patch && locked) return Promise.resolve(resolve({ data: [] }));
          if ('send_started_at' in patch) locked = true;
          writes.push({ table, patch });
          return Promise.resolve(resolve({ data: select ? [{ id }] : null }));
        },
      };
      return query;
    },
  };
  const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
    const path = String(url).replace('https://api.brevo.com/v3', '');
    const method = init?.method ?? 'GET';
    calls.push({ path, method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (method === 'GET') {
      if (behavior === 'network') throw new Error('network');
      if (behavior === 'deleted') return new Response('{}', { status: 404 });
      const listId = Number(path.match(/\/lists\/(\d+)/)?.[1]);
      if (!path.includes('/contacts?')) return Response.json({ id: listId, name: ({ 33: 'Canada', 148: 'Germany', 175: 'USA', 179: 'Test only' } as Record<number, string>)[listId] });
      return Response.json({ contacts: behavior === 'empty' ? [] : [{ email: 'buyer@example.org', emailBlacklisted: false }] });
    }
    if (path === '/emailCampaigns') return Response.json({ id: 999 }, { status: 201 });
    if (path.endsWith('/sendNow')) {
      if (behavior === 'uncertain') throw new Error('uncertain');
      return new Response(null, { status: 204 });
    }
    throw new Error('Unexpected request in dry-run fixture');
  }) as typeof fetch;
  const c = { id, user_id: 'producer', name: 'Fixture', status: 'pending_validation', target_markets: markets,
    message_html: `<p>{{ mirror }} {{ unsubscribe }} https://wine-exporters.com/interest/${id}</p>`, subject_selected: '{{ contact.COMPANY_NAME }} Fixture' };
  return { writes, calls, c, context: { admin, fetchFn, brevoKey: 'fake-test-only', reviewerId: 'admin', testListId: '179' } };
}
Deno.test('partial mapping never creates or sends a campaign and never writes to the database', async () => {
  const f = fixture(['Germany','Philippines']);
  assertEquals((await sendCustomCampaign(f.context, f.c, { testRequested: false, isTest: false })).status, 422);
  assertEquals(f.calls.length, 0); assertEquals(f.writes.length, 0);
});
Deno.test('empty, deleted or unavailable lists cause no mutation or provider POST', async () => {
  for (const behavior of ['empty','deleted','network'] as const) {
    const f = fixture(['Canada'], behavior);
    const result = await sendCustomCampaign(f.context, f.c, { testRequested: false, isTest: false });
    assertEquals(result.status === 422 || result.status === 502, true);
    assertEquals(f.calls.some(c => c.method !== 'GET'), false); assertEquals(f.writes.length, 0);
  }
});
Deno.test('manual send preserves HTML and actually targets Canada, Germany and USA once', async () => {
  const f = fixture(['Canada','Germany','USA','United States']);
  const r = await sendCustomCampaign(f.context, f.c, { testRequested: false, isTest: false });
  assertEquals(r.body.result, 'sent');
  const created = f.calls.find(c => c.path === '/emailCampaigns');
  assertEquals(created?.body?.recipients, { listIds: [33,148,175] });
  assertEquals(created?.body?.htmlContent, f.c.message_html);
  assertEquals(f.calls.filter(c => c.path.endsWith('/sendNow')).length, 1);
  assertEquals((await sendCustomCampaign(f.context, f.c, { testRequested: false, isTest: false })).status, 409);
  assertEquals(f.calls.filter(c => c.path.endsWith('/sendNow')).length, 1);
});
Deno.test('test mode uses the test list exclusively, even with an unmapped real country', async () => {
  const f = fixture(['Philippines']);
  const r = await sendCustomCampaign(f.context, f.c, { testRequested: true, isTest: false });
  assertEquals(r.body.test, true);
  assertEquals(f.calls.find(c => c.path === '/emailCampaigns')?.body?.recipients, { listIds: [179] });
});
Deno.test('uncertain sends keep the Brevo ID and are never retried automatically', async () => {
  const f = fixture(['Canada'], 'uncertain');
  const r = await sendCustomCampaign(f.context, f.c, { testRequested: false, isTest: false });
  assertEquals(r.status, 504);
  assertEquals(f.writes.some(w => w.patch.brevo_campaign_id === 999), true);
  assertEquals(f.writes.some(w => w.patch.send_error === 'uncertain'), true);
  assertEquals(f.calls.filter(c => c.path.endsWith('/sendNow')).length, 1);
});