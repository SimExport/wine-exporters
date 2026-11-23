import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildImporterNeeds } from './importer-request-needs';

const req = { wine_styles: 'Rouge, Blanc', wine_styles_en: 'Red, White', origins: 'Bordeaux', origins_en: null, volume: '5000 btl', requirements: 'Vins bio', requirements_en: 'Organic wines' };

test('picks English variants with raw fallback', () => {
  const n = buildImporterNeeds(req, 'snip', 'en')!;
  assert.deepEqual(n.styles, ['Red', 'White']);
  assert.deepEqual(n.origins, ['Bordeaux']);
  assert.equal(n.requirements, 'Organic wines');
  assert.equal(n.fallbackSnippet, '');
});

test('picks French raw values', () => {
  const n = buildImporterNeeds(req, null, 'fr')!;
  assert.deepEqual(n.styles, ['Rouge', 'Blanc']);
  assert.equal(n.requirements, 'Vins bio');
});

test('missing request falls back to stored snippet', () => {
  assert.equal(buildImporterNeeds(null, ' Rouge · Bordeaux ', 'fr')!.fallbackSnippet, 'Rouge · Bordeaux');
});

test('nothing available hides the block', () => {
  assert.equal(buildImporterNeeds(null, '  ', 'en'), null);
  assert.equal(buildImporterNeeds({ wine_styles: '' }, '', 'fr'), null);
});
