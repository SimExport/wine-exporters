import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { hasReliableDescription, importLabel, descriptionFor, importerProfileRepository, safeExternalUrl, type ImporterEnrichment } from './importer-profile';

const verified: ImporterEnrichment = {
  description_fr: 'Description complète\n\nDernier paragraphe.', description_en: 'Full description.',
  confidence: 'high', status: 'verified', source_urls: ['https://example.com/about'],
  direct_import_status: 'confirmed_direct_import',
};
const expect = (actual: unknown) => ({
  toBe: (expected: unknown) => assert.equal(actual, expected),
  toEqual: (expected: unknown) => assert.deepEqual(actual, expected),
  toBeNull: () => assert.equal(actual, null),
});
describe('Importer profile factual safeguards', () => {
  test('a badge needs a reliable description, not only enrichment metadata', () => {
    expect(hasReliableDescription(verified)).toBe(true);
    expect(hasReliableDescription({ ...verified, description_fr: '', description_en: '' })).toBe(false);
    expect(hasReliableDescription({ ...verified, status: 'review_needed' })).toBe(false);
    expect(hasReliableDescription({ ...verified, confidence: 'low' })).toBe(false);
    expect(hasReliableDescription({ ...verified, source_urls: [] })).toBe(false);
  });
  test('direct importing needs explicit sourced evidence before confirmation', () => {
    expect(importLabel(verified, [])).toBe('reported');
    expect(importLabel(verified, [{ field_name: 'direct_import_status', field_value: 'confirmed_direct_import', confidence: 'high', source_url: 'https://example.com/imports' }])).toBe('confirmed');
    expect(importLabel({ ...verified, direct_import_status: 'confirmed_direct_sourcing' }, [])).toBe('unconfirmed');
  });
  test('descriptions retain all text and select the available language', () => {
    expect(descriptionFor(verified, 'fr').text).toBe('Description complète\n\nDernier paragraphe.');
    expect(descriptionFor(verified, 'en').text).toBe('Full description.');
    expect(descriptionFor({ ...verified, description_en: null }, 'en')).toEqual({ text: 'Description complète\n\nDernier paragraphe.', language: 'fr' });
  });
  test('external source links reject executable schemes and credentials', () => {
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(safeExternalUrl('https://user:pass@example.com')).toBeNull();
    expect(safeExternalUrl('https://example.com/about')).toBe('https://example.com/about');
  });
  test('default repository cannot expose protected enrichment data', async () => {
    expect(await importerProfileRepository.load('any-contact', new AbortController().signal)).toEqual({ status: 'not-connected' });
  });
});