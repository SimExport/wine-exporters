import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { hasReliableDescription, importLabel, descriptionFor, mapProfileResponse, safeExternalUrl, additionalProfileEmails, type ImporterEnrichment } from './importer-profile';

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
  test('database confirmed status is displayed as confirmed, including Wuttke', () => {
    expect(importLabel({ ...verified, direct_import_status: 'confirmed' }, [])).toBe('confirmed');
    expect(importLabel({ ...verified, direct_import_status: 'not_confirmed' }, [])).toBe('unconfirmed');
  });
  test('three structured people retain their original roles and commercial notes separately', () => {
    const result = mapProfileResponse({ enrichment: { commercial_notes: 'General company contact' }, people: [
      { id: '1', full_name: 'Wolfgang Wuttke', job_title: 'Propriétaire', confidence: 'high' },
      { id: '2', full_name: 'Florian Wuttke', job_title: 'Développement de la société', confidence: 'high' },
      { id: '3', full_name: 'Christine Buchborn', job_title: 'Responsable administrative', confidence: 'medium' },
    ] });
    assert.equal(result.status, 'ready');
    if (result.status !== 'ready') return;
    assert.equal(result.data.people.length, 3);
    assert.deepEqual(result.data.people.map(p => p.job_title), ['Propriétaire', 'Développement de la société', 'Responsable administrative']);
    assert.equal(result.data.people[0].business_email, undefined);
    assert.equal(result.data.enrichment?.commercial_notes, 'General company contact');
  });
  test('structured emails are trimmed and deduplicated against primary and person emails without requiring a source', () => {
    const result = mapProfileResponse({ people: [{ business_email: 'Buyer@example.com' }], emails: [
      { id: '1', email: ' MAIN@example.com ' }, { id: '2', email: 'buyer@example.com' },
      { id: '3', email: ' Sales@example.com ' }, { id: '4', email: 'sales@EXAMPLE.com' }, { id: '5', email: ' ' },
    ] });
    if (result.status !== 'ready') assert.fail('Expected ready profile');
    assert.deepEqual(additionalProfileEmails(result.data, 'main@example.com').map(e => e.email), ['Sales@example.com']);
  });
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
  test('RPC payloads map to the read model and keep every enrichment status', () => {
    const payload = {
      enrichment: { ...verified, status: 'review_needed' },
      people: [{ id: 'p1', full_name: 'Jane', confidence: 'medium' }],
      emails: [],
      evidence: [{ field_name: 'direct_import_status', field_value: 'confirmed_direct_import', confidence: 'high', source_url: 'https://example.com/x' }],
    };
    const result = mapProfileResponse(payload);
    assert.equal(result.status, 'ready');
    if (result.status !== 'ready') return;
    expect(result.data.enrichment?.status).toBe('review_needed');
    expect(result.data.people.length).toBe(1);
    expect(result.data.evidence.length).toBe(1);
  });
  test('empty or malformed RPC payloads become a neutral empty profile', () => {
    for (const payload of [null, undefined, {}, { enrichment: null, people: null }]) {
      const result = mapProfileResponse(payload);
      assert.equal(result.status, 'ready');
      if (result.status !== 'ready') return;
      expect(result.data.enrichment).toBeNull();
      expect(result.data.people).toEqual([]);
      expect(result.data.emails).toEqual([]);
      expect(result.data.evidence).toEqual([]);
    }
  });
});