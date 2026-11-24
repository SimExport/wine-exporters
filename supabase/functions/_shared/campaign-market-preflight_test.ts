import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { campaignMarketPreflight } from './campaign-market-preflight.ts';
const usable = { contacts: [{ email: 'buyer@example.org', emailBlacklisted: false }] };
Deno.test('one unmapped country blocks every country before even a provider GET', async () => {
  let reads = 0;
  const r = await campaignMarketPreflight(['Germany','Belarus'], async () => { reads++; return new Response('{}'); });
  assertEquals(r.failure?.status, 422); assertEquals(r.listIds, []); assertEquals(reads, 0);
});
Deno.test('Canada is actually targeted; aliases never duplicate a list', async () => {
  const paths: string[] = [];
  const r = await campaignMarketPreflight(['Canada','Canada '], async p => { paths.push(p); return Response.json(p.includes('/contacts?') ? usable : { id: 33, name: 'Canada' }); });
  assertEquals(r.listIds, [33]); assertEquals(paths.length, 2);
});
Deno.test('empty or fully blacklisted list blocks targeting', async () => {
  for (const contacts of [[], [{ email: 'buyer@example.org', emailBlacklisted: true }]]) {
    const r = await campaignMarketPreflight(['Cyprus'], async p => Response.json(p.includes('/contacts?') ? { contacts } : { id: 142, name: 'Cyprus' }));
    assertEquals(r.failure?.status, 422); assertEquals(r.listIds, []);
  }
});
Deno.test('deleted list, malformed payload and read failure fail closed', async () => {
  assertEquals((await campaignMarketPreflight(['Canada'], async () => new Response('{}', { status: 404 }))).failure?.status, 422);
  assertEquals((await campaignMarketPreflight(['Canada'], async () => { throw new Error('network'); })).failure?.status, 502);
  assertEquals((await campaignMarketPreflight(['Canada'], async p => Response.json(p.includes('/contacts?') ? {} : { id: 33, name: 'Canada' }))).failure?.status, 502);
});
Deno.test('fully blacklisted first page is not confused with an empty list', async () => {
  const r = await campaignMarketPreflight(['Canada'], async p => Response.json(!p.includes('/contacts?') ? { id: 33, name: 'Canada' } : p.includes('offset=0') ? { contacts: Array.from({ length: 500 }, () => ({ email: 'blocked@example.org', emailBlacklisted: true })) } : usable));
  assertEquals(r.listIds, [33]);
});
Deno.test('a configured ID with another country name is refused, never substituted', async () => {
  const r = await campaignMarketPreflight(['Canada'], async () => Response.json({ id: 33, name: 'France' }));
  assertEquals(r.failure?.status, 422); assertEquals(r.listIds, []);
});
Deno.test('historic Malta/Lithuania/Latvia targeting still uses their exact verified country lists', async () => {
  const names: Record<number, string> = { 158: 'Malta', 156: 'Lithuania', 155: 'Latvia' };
  const r = await campaignMarketPreflight(['Malta','Lithuania','Latvia'], async p => Response.json(p.includes('/contacts?') ? usable : { id: Number(p.split('/').at(-1)), name: names[Number(p.split('/').at(-1))] }));
  assertEquals(r.failure, undefined); assertEquals(r.listIds, [158,156,155]);
});