import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { DIRECTORY_COUNTRIES } from '../src/lib/directory-countries';

const drafts = JSON.parse(readFileSync(new URL('../docs/seo-editorial/cms-drafts.json', import.meta.url), 'utf8')) as { slug: string; status: string; published_at: string | null; country: string; content: string }[];

test('exactly six local drafts are prepared, one per requested country', () => {
  assert.equal(drafts.length, 6);
  assert.equal(new Set(drafts.map(draft => draft.country)).size, 6);
  assert.deepEqual(drafts.map(draft => draft.slug), DIRECTORY_COUNTRIES.map(country => country.articleSlug));
});
test('every prepared article remains a draft without a publication timestamp', () => {
  for (const draft of drafts) {
    assert.equal(draft.status, 'draft');
    assert.equal(draft.published_at, null);
  }
});