import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { clearSnapshotIf, createAutosaver, readSnapshot, shouldOfferRecovery, snapshotKey, writeSnapshot, type KV, type SaveStatus } from './email-autosave';

type D = { text: string };
const deferred = () => { let resolve!: (v: boolean) => void; const p = new Promise<boolean>((r) => { resolve = r; }); return { p, resolve }; };
const tick = () => new Promise((r) => setTimeout(r, 0));

function setup(opts: { valid?: (d: D) => boolean } = {}) {
  const timers: { fn: () => void; ms: number }[] = [];
  const calls: { d: D; done: ReturnType<typeof deferred> }[] = [];
  const statuses: SaveStatus[] = [];
  const a = createAutosaver<D>({
    keyOf: (d) => d.text,
    isValid: opts.valid ?? ((d) => d.text.length > 0),
    save: (d) => { const done = deferred(); calls.push({ d, done }); return done.p; },
    onStatus: (s) => statuses.push(s),
    setTimer: (fn, ms) => { const h = { fn, ms }; timers.push(h); return h; },
    clearTimer: (h) => { const i = timers.indexOf(h as any); if (i >= 0) timers.splice(i, 1); },
  });
  const fire = () => { const t = timers.shift(); t?.fn(); };
  return { a, timers, calls, statuses, fire };
}

describe('autosave', () => {
  test('waits 2 s after the last edit, one request for many keystrokes', async () => {
    const { a, timers, calls, fire } = setup();
    a.edit({ text: 'a' }); a.edit({ text: 'ab' }); a.edit({ text: 'abc' });
    assert.equal(timers.length, 1); assert.equal(timers[0].ms, 2000); assert.equal(calls.length, 0);
    fire(); await tick();
    assert.equal(calls.length, 1); assert.equal(calls[0].d.text, 'abc');
  });

  test('"saved" only after the server answered', async () => {
    const { a, calls, statuses, fire } = setup();
    a.edit({ text: 'x' }); fire(); await tick();
    assert.equal(a.status, 'saving'); assert.ok(!statuses.includes('saved'));
    calls[0].done.resolve(true); await tick();
    assert.equal(a.status, 'saved'); assert.ok(a.isSaved());
  });

  test('an older response never marks newer edits as saved, then the newer one is saved', async () => {
    const { a, calls, fire } = setup();
    a.edit({ text: 'v1' }); fire(); await tick();
    a.edit({ text: 'v2' }); // typed during the request
    calls[0].done.resolve(true); await tick();
    assert.equal(a.isSaved(), false); assert.equal(a.status, 'pending');
    fire(); await tick();
    assert.equal(calls.length, 2); assert.equal(calls[1].d.text, 'v2');
    calls[1].done.resolve(true); await tick();
    assert.equal(a.status, 'saved'); assert.ok(a.isSaved());
  });

  test('saves are serialized: never two requests at once', async () => {
    const { a, calls, fire } = setup();
    a.edit({ text: 'v1' }); fire(); await tick();
    a.edit({ text: 'v2' });
    const f = a.flush(); await tick();
    assert.equal(calls.length, 1);
    calls[0].done.resolve(true); await tick();
    assert.equal(calls.length, 2);
    calls[1].done.resolve(true);
    assert.equal(await f, true);
  });

  test('failure shows error and flush reports it (no false confirmation)', async () => {
    const { a, calls } = setup();
    a.edit({ text: 'x' });
    const f = a.flush(); await tick();
    calls[0].done.resolve(false);
    assert.equal(await f, false); assert.equal(a.status, 'error'); assert.equal(a.isSaved(), false);
  });

  test('invalid drafts are never sent', async () => {
    const { a, calls, timers } = setup();
    a.edit({ text: '' });
    assert.equal(timers.length, 0); assert.equal(a.status, 'invalid');
    assert.equal(await a.flush(), false); assert.equal(calls.length, 0);
  });

  test('version already on the server (reopen / AI applied) needs no request', async () => {
    const { a, calls } = setup();
    a.markSaved('srv'); a.edit({ text: 'srv' });
    assert.equal(await a.flush(), true); assert.equal(calls.length, 0); assert.equal(a.status, 'saved');
  });
});

const mem = (): KV & { m: Map<string, string> } => { const m = new Map<string, string>(); return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: (k) => { m.delete(k); } }; };

describe('local safety net', () => {
  test('scoped per user and per campaign', () => {
    const s = mem();
    writeSnapshot(s, 'u1', 'c1', { text: 'a' }, 'a', 10);
    assert.equal(readSnapshot(s, 'u2', 'c1'), null);
    assert.equal(readSnapshot(s, 'u1', 'c2'), null);
    assert.equal(readSnapshot<D>(s, 'u1', 'c1')?.draft.text, 'a');
    assert.notEqual(snapshotKey('u1', 'c1'), snapshotKey('u2', 'c1'));
  });

  test('cleared only by the confirmed save of the same version', () => {
    const s = mem();
    writeSnapshot(s, 'u', 'c', { text: 'new' }, 'new', 10);
    clearSnapshotIf(s, 'u', 'c', 'old');
    assert.ok(readSnapshot(s, 'u', 'c'));
    clearSnapshotIf(s, 'u', 'c', 'new');
    assert.equal(readSnapshot(s, 'u', 'c'), null);
  });

  test('recovery offered only when different and newer than the server', () => {
    const at = Date.parse('2026-11-13T10:00:00Z');
    const snap = { draft: { text: 'local' }, key: 'local', at };
    assert.equal(shouldOfferRecovery(snap, 'server', '2026-11-13T09:59:00Z'), true);
    assert.equal(shouldOfferRecovery(snap, 'server', '2026-11-13T10:01:00Z'), false); // server newer: never overwrite
    assert.equal(shouldOfferRecovery(snap, 'local', '2026-11-13T09:00:00Z'), false); // identical
    assert.equal(shouldOfferRecovery(null, 'server', null), false);
  });

  test('corrupt storage is ignored', () => {
    const s = mem(); s.setItem(snapshotKey('u', 'c'), '{not json');
    assert.equal(readSnapshot(s, 'u', 'c'), null);
  });
});

test('regression: parent flush saves an unapplied AI proposal instead of reporting a false success', async () => {
  const { createAutosaver, flushCurrent } = await import('./email-autosave');
  const saved: string[] = [];
  const mk = () => createAutosaver<{ v: string }>({ keyOf: (d) => d.v, isValid: (d) => d.v !== '', save: async (d) => { saved.push(d.v); return true; }, onStatus: () => {}, setTimer: () => 1, clearTimer: () => {} });
  const bare = mk();
  assert.equal(await bare.flush(), true); // the old bug: nothing written yet "success"
  assert.deepEqual(saved, []);
  const a = mk();
  assert.equal(await flushCurrent(a, { v: 'proposal' }, true), true);
  assert.deepEqual(saved, ['proposal']);
  assert.equal(a.isSaved(), true);
  const b = mk();
  assert.equal(await flushCurrent(b, { v: '' }, true), false); // invalid proposal refuses
});
