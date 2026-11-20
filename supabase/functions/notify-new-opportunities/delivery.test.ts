import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deliverBatches, pendingChunks, providerOutcome, notificationResult, type Batch, type Outcome } from './delivery';

test('65 recipients, 15 already accepted: exactly 49 + 1 BCC remain', () => {
  const rows = Array.from({ length: 65 }, (_, i) => ({ email: `user${i}@example.com`, state: i < 15 ? 'accepted' : 'pending' }));
  const chunks = pendingChunks(rows);
  assert.deepEqual(chunks.map(c => c.length), [49, 1]);
  assert.equal(chunks.flat().some(e => rows.slice(0, 15).some(r => r.email === e)), false);
  assert.equal(chunks[0].length + 1, 50);
});
test('normalization and deduplication do not duplicate an address', () => {
  assert.deepEqual(pendingChunks([{email:' A@example.com ',state:'pending'},{email:'a@example.com',state:'failed'}]), [['a@example.com']]);
});
test('accepted is API acceptance only, failures and uncertainty stay distinct', () => {
  assert.deepEqual(providerOutcome(200, { id: 'resend-id' }), { state: 'accepted', resendId: 'resend-id' });
  assert.equal(providerOutcome(422, { name: 'validation_error' }).state, 'failed');
  assert.equal(providerOutcome(500, {}).state, 'indeterminate');
  assert.equal(providerOutcome(200, {}).state, 'indeterminate');
  assert.equal(providerOutcome(409, {}).state, 'indeterminate');
});
test('dry run persists accepted batches and resuming sends none twice', async () => {
  const rows = Array.from({length:65}, (_,i) => ({email:`user${i}@example.com`,state:i<15?'accepted':'pending'}));
  const queue = pendingChunks(rows).map((emails,i) => ({id:`b${i}`,operation_id:'op',idempotency_key:`op/b${i}`,emails}));
  const calls: Batch[] = [];
  const deps = {
    claim: async () => queue.shift() ?? null,
    send: async (b: Batch): Promise<Outcome> => { calls.push(b); return { state:'accepted',resendId:`r-${b.id}` }; },
    finish: async (b: Batch, o: Outcome) => { rows.filter(r=>b.emails.includes(r.email)).forEach(r=>{r.state=o.state;}); },
    pause: async () => {},
  };
  await deliverBatches(deps); await deliverBatches(deps);
  assert.deepEqual(calls.map(b=>b.emails.length), [49,1]);
  assert.equal(rows.filter(r=>r.state==='accepted').length,65);
  assert.equal(new Set(calls.flatMap(b=>b.emails)).size,50);
});
test('network uncertainty stops before the next batch', async () => {
  let claims = 0; const outcomes: Outcome[] = [];
  await deliverBatches({claim:async()=>{claims++;return {id:'b',operation_id:'op',idempotency_key:'stable',emails:['u@example.com']};},send:async()=>{throw new Error('timeout');},finish:async(_,o)=>{outcomes.push(o);},pause:async()=>{}});
  assert.equal(claims,1); assert.equal(outcomes[0].state,'indeterminate');
});
test('explicit API error stops and preserves the failure', async () => {
  let claims = 0; let saved: Outcome | undefined;
  await deliverBatches({claim:async()=>{claims++;return {id:'b',operation_id:'op',idempotency_key:'stable',emails:['u@example.com']};},send:async()=>providerOutcome(422,{}),finish:async(_,o)=>{saved=o;},pause:async()=>{}});
  assert.equal(claims,1); assert.equal(saved?.state,'failed');
});
test('partial result is success=false without losing accepted/remaining/error counters', () => {
  const operation = { status:'active',accepted:15,remaining:50,failed:49,indeterminate:0,total:65 };
  const result = notificationResult(operation);
  assert.equal(result.success,false);
  assert.deepEqual(result.operation,operation);
  assert.equal(notificationResult({...operation,status:'completed',accepted:65,remaining:0,failed:0}).success,true);
  assert.equal(notificationResult({...operation,status:'completed',remaining:0,failed:0,indeterminate:1}).success,false);
});