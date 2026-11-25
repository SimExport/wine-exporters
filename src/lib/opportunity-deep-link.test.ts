import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageContaining, parseOpportunityDeepLink, resolveOpportunityDeepLink } from './opportunity-deep-link';

const ID = '3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b';

test('parses direct and tender links from the weekly email', () => {
  assert.deepEqual(parseOpportunityDeepLink(`?weType=direct&weId=${ID}`), { tab: 'direct', type: 'importer', id: ID });
  assert.deepEqual(parseOpportunityDeepLink(`?weType=tender&weId=${ID.toUpperCase()}`), { tab: 'tender', type: 'tender', id: ID });
});

test('invalid or partial links are ignored', () => {
  assert.equal(parseOpportunityDeepLink(''), null);
  assert.equal(parseOpportunityDeepLink(`?weType=archives&weId=${ID}`), null);
  assert.equal(parseOpportunityDeepLink('?weType=direct&weId=not-a-uuid'), null);
  assert.equal(parseOpportunityDeepLink(`?weId=${ID}`), null);
});

test('recommended → For my estate; not recommended → All; archived and missing never throw', () => {
  const link = parseOpportunityDeepLink(`?weType=tender&weId=${ID}`)!;
  const rows = [{ id: 'other' }, { id: ID }];
  assert.deepEqual(resolveOpportunityDeepLink(link, rows, new Set(), k => k === `tender:${ID}`), { status: 'active', key: `tender:${ID}`, mode: 'mine' });
  assert.deepEqual(resolveOpportunityDeepLink(link, rows, new Set(), () => false), { status: 'active', key: `tender:${ID}`, mode: 'all' });
  assert.deepEqual(resolveOpportunityDeepLink(link, rows, new Set([`tender:${ID}`]), () => true), { status: 'archived', key: `tender:${ID}` });
  assert.deepEqual(resolveOpportunityDeepLink(link, [{ id: 'other' }], new Set(), () => true), { status: 'missing' });
});

test('page containing the linked tender', () => {
  const rows = Array.from({ length: 25 }, (_, i) => ({ id: `t${i}` }));
  assert.equal(pageContaining(rows, 'tender', 'tender:t0', 10), 1);
  assert.equal(pageContaining(rows, 'tender', 'tender:t21', 10), 3);
  assert.equal(pageContaining(rows, 'tender', 'tender:zz', 10), null);
});
