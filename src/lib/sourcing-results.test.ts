import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { addSourcingProspects, sourcingSelectionIndices } from './sourcing-results';

test('add all includes every page, excluding already completed prospects', () => {
  assert.deepEqual(sourcingSelectionIndices(15, new Set([0, 14])), Array.from({ length: 13 }, (_, i) => i + 1));
});

test('multi-selection adds only selected prospects not already completed', () => {
  assert.deepEqual(sourcingSelectionIndices(15, new Set([3]), new Set([1, 3, 12])), [1, 12]);
});

test('bulk addition processes each prospect once and keeps successes after a failure', async () => {
  const calls: number[] = [];
  const result = await addSourcingProspects([0, 1, 1, 2, 3], async index => {
    calls.push(index);
    if (index === 2) throw new Error('Rejected');
    return index === 1 ? 'existing' : 'added';
  });
  assert.deepEqual(calls, [0, 1, 2, 3]);
  assert.deepEqual(result, { added: 2, existing: 1, completed: [0, 1, 3], failed: [2] });
});