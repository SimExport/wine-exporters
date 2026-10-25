import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportCount, boundedSelection, updateSelection, firstResultIds, normalizeCountrySearch } from './importer-selection';
test('2044 contacts, 500 credits: at most 500', () => assert.equal(exportCount(500, 2044), 500));
test('314 credits: at most 314', () => assert.equal(exportCount(314, 2044), 314));
test('zero credits: no selection or export', () => {
  assert.equal(exportCount(0, 2044), 0);
  assert.equal(updateSelection([], ['a'], true, 0).size, 0);
});
test('individual and page additions obey cap; removals work', () => {
  assert.deepEqual([...updateSelection(['a'], ['b', 'c'], true, 2)], ['a', 'b']);
  assert.deepEqual([...updateSelection(['a', 'b'], ['a'], false, 2)], ['b']);
});
test('balance decrease trims selections', () => assert.equal(boundedSelection(Array.from({length:500}, (_,i)=>String(i)),314).size,314));
test('small country remains exportable', () => assert.equal(exportCount(500, 8), 8));
test('global selection loads only first N, requests <=100, preserves order', async () => {
  const calls: number[] = [];
  const ids = await firstResultIds(314, async (offset, limit) => {
    calls.push(limit); return Array.from({length:limit}, (_,i)=>String(offset+i));
  });
  assert.deepEqual(calls, [100,100,100,14]);
  assert.equal(ids.length,314); assert.equal(ids[313],'313');
  let called = false;
  assert.deepEqual(await firstResultIds(0, async()=>{called=true;return [];}),[]);
  assert.equal(called,false);
});
test('FR/EN accent insensitive search', () => assert.equal(normalizeCountrySearch(' ÉTATS-Unis '),'etats-unis'));