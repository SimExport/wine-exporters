import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeText, canonicalCountry, matchesFilters, EMPTY_FILTERS, isMediatedEmail, buildMailto, buildOptions, hasActiveFilters } from './opportunity-filters.ts';

test('accents and case are normalized', () => {
  assert.equal(normalizeText('Rosé  Côtes-du-Rhône'), 'rose cotes du rhone');
});

test('FR and EN country variants share one key', () => {
  assert.equal(canonicalCountry('Belgique'), canonicalCountry('Belgium'));
  assert.equal(canonicalCountry('Suède'), 'SE');
  assert.equal(canonicalCountry('United Kingdom of Great Britain and Northern Ireland'), 'GB');
  assert.equal(canonicalCountry('Irelande'), 'IE');
  assert.equal(canonicalCountry('USA'), 'US');
  assert.equal(canonicalCountry('Atlantis'), 'raw:atlantis');
});

const item = { country: 'BE', styles: ['Vin rosé'], origins: ['Provence'], haystack: 'Bottleneck BV Côtes de Provence' };

test('no filter shows everything', () => {
  assert.equal(matchesFilters(item, EMPTY_FILTERS), true);
  assert.equal(hasActiveFilters(EMPTY_FILTERS), false);
});

test('filters combine', () => {
  assert.equal(matchesFilters(item, { ...EMPTY_FILTERS, country: 'BE', style: 'vin rose' }), true);
  assert.equal(matchesFilters(item, { ...EMPTY_FILTERS, country: 'BE', origin: 'bordeaux' }), false);
  assert.equal(matchesFilters(item, { ...EMPTY_FILTERS, q: 'cotes PROVENCE' }), true);
  assert.equal(matchesFilters(item, { ...EMPTY_FILTERS, q: 'bourgogne' }), false);
  assert.equal(matchesFilters(item, { ...EMPTY_FILTERS, q: '(([*' }), true);
});

test('options dedupe accents', () => {
  assert.deepEqual(buildOptions([['Rosé'], ['rose', 'Blanc']], 'fr').map(o => o.label), ['Blanc', 'Rosé']);
});

test('mediation mailbox detected', () => {
  assert.equal(isMediatedEmail('simon@exportvins.fr'), true);
  assert.equal(isMediatedEmail('buyer@sommal.com'), false);
});

test('mailto encodes subject and body', () => {
  assert.equal(buildMailto('a@b.se', 'Vin & co', 'L1\nL2'), 'mailto:a@b.se?subject=Vin%20%26%20co&body=L1%0AL2');
});
