import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildDirectoryGuideJsonLd, directoryGuideSourceUrl, guideArticles, guideForCountry, parsePublishedDirectoryGuide } from './directory-guides';

const row = () => ({
  country_code: 'DE', language: 'fr', status: 'published', published_at: '2026-11-01T00:00:00.000Z',
  h1: 'Importateurs de vin en Allemagne : guide de marché et exemples', intro: 'Introduction éditoriale.',
  market_overview: '## Un marché à préparer\n\nRepères éditoriaux.', demand_notes: null, importer_types: null,
  how_to_approach: 'Préparer une présentation claire.', meta_title: null, meta_description: null,
  key_figures: [{ label: 'Indice fictif', value: '12', unit: 'unités', as_of: '2025', source_name: 'Source fictive', source_url: 'https://example.org/chiffre' }],
  faq: [{ question: 'Comment commencer ?', answer: 'Avec une présentation adaptée.' }],
  sources: [{ label: 'Source institutionnelle fictive', url: 'https://example.org/marche' }],
  related_article_slugs: ['trouver-importateur-vin-allemagne'],
});
const now = new Date('2026-11-12T00:00:00.000Z');

test('only published, past and complete guides are accepted', () => {
  assert.ok(parsePublishedDirectoryGuide(row(), now));
  assert.equal(parsePublishedDirectoryGuide({ ...row(), status: 'draft' }, now), null);
  assert.equal(parsePublishedDirectoryGuide({ ...row(), published_at: null }, now), null);
  assert.equal(parsePublishedDirectoryGuide({ ...row(), published_at: '2027-01-01T00:00:00.000Z' }, now), null);
  assert.equal(parsePublishedDirectoryGuide({ ...row(), market_overview: '' }, now), null);
});

test('every key figure requires a public HTTPS source', () => {
  for (const sourceUrl of [undefined, '', 'http://example.org/chiffre', 'https://user:secret@example.org/chiffre']) {
    const input = row();
    input.key_figures[0].source_url = sourceUrl as string;
    assert.equal(parsePublishedDirectoryGuide(input, now), null, String(sourceUrl));
  }
  const missingName = row();
  missingName.key_figures[0].source_name = '';
  assert.equal(parsePublishedDirectoryGuide(missingName, now), null);
  assert.equal(directoryGuideSourceUrl('https://example.org/source?a=1'), 'https://example.org/source?a=1');
});

test('malformed FAQ, sources and related slugs fail closed', () => {
  assert.equal(parsePublishedDirectoryGuide({ ...row(), faq: [{ question: 'Sans réponse' }] }, now), null);
  assert.equal(parsePublishedDirectoryGuide({ ...row(), sources: [{ label: 'Source', url: 'javascript:alert(1)' }] }, now), null);
  assert.equal(parsePublishedDirectoryGuide({ ...row(), related_article_slugs: ['../buyer_contacts'] }, now), null);
});

test('public guide projection omits private or administrative fields', () => {
  const guide = parsePublishedDirectoryGuide({ ...row(), email: 'private@example.org', updated_by: 'private-user-id' }, now)!;
  assert.equal('email' in guide, false);
  assert.equal('updated_by' in guide, false);
  assert.equal('updatedBy' in guide, false);
});

test('guide language is exact and related articles use only the supplied published list', () => {
  const guide = parsePublishedDirectoryGuide(row(), now)!;
  assert.equal(guideForCountry([guide], 'DE', 'en-US'), null);
  assert.equal(guideForCountry([guide], 'DE', 'fr'), guide);
  const published = [{ id: '1', slug: 'trouver-importateur-vin-allemagne', title: 'Article publié' } as never];
  assert.deepEqual(guideArticles(guide, published).map(article => article.id), ['1']);
  assert.deepEqual(guideArticles(guide, []), []);
});

test('JSON-LD contains WebPage, breadcrumbs, FAQ and company names with canonical URLs only', () => {
  const guide = parsePublishedDirectoryGuide(row(), now)!;
  const data = buildDirectoryGuideJsonLd({ guide, path: '/annuaire/allemagne.html', countryName: 'Allemagne', homeLabel: 'Accueil', directoryLabel: 'Annuaire', companies: [{ name: 'Exemple public', path: '/annuaire/allemagne/exemple.html' }] });
  assert.deepEqual(data.map(item => item['@type']), ['WebPage', 'BreadcrumbList', 'FAQPage', 'ItemList']);
  const serialized = JSON.stringify(data);
  assert.ok(serialized.includes('https://wine-exporters.com/annuaire/allemagne/exemple.html'));
  assert.ok(!serialized.includes('email'));
});
