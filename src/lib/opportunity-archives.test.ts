import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { partitionOpportunities } from './opportunity-archives'

test('archive hides only from the current user and never removes shared opportunities', () => {
  const rows = [{ id: 'one' }, { id: 'two' }]
  const userA = partitionOpportunities(rows, 'importer', new Set(['importer:one']))
  const userB = partitionOpportunities(rows, 'importer', new Set())
  assert.deepEqual(userA.active, [{ id: 'two' }])
  assert.deepEqual(userA.archived, [{ id: 'one' }])
  assert.deepEqual(userB.active, rows)
  assert.equal(rows.length, 2)
})

test('restoring returns an archived opportunity to the main panel', () => {
  const keys = new Set(['importer:one'])
  keys.delete('importer:one')
  const result = partitionOpportunities([{ id: 'one' }], 'importer', keys)
  assert.deepEqual(result.active, [{ id: 'one' }])
  assert.equal(result.archived.length, 0)
})

test('direct requests and tenders are archived independently even with the same id', () => {
  const rows = [{ id: 'one' }]
  assert.equal(partitionOpportunities(rows, 'tender', new Set(['importer:one'])).active.length, 1)
})