import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { importLabel, profileSources, type ImporterProfileData } from '../../lib/importer-profile';
import { importerProfileEn, importerProfileFr } from '../../i18n/locales/importer-profile';

// The sheet is a Radix dialog, so it cannot be rendered without a DOM here.
// These guards instead pin the two presentation rules the client asked for:
// provenance must never be rendered, useful company/contact links must stay.
const sheet = readFileSync(new URL('./ImporterProfileSheet.tsx', import.meta.url), 'utf8');

describe('Importer profile sheet: provenance hidden from producers', () => {
  test('no source-provenance link or import-activity block is rendered', () => {
    for (const banned of [
      /source_url/,
      /profileSources/,
      /importLabel/,
      /importerProfile\.sources/,
      /importerProfile\.importing/,
      /importerProfile\.source\b/,
    ]) {
      assert.equal(banned.test(sheet), false, `sheet must not render ${banned}`);
    }
  });

  test('official website, social networks and decision-maker LinkedIn links are kept', () => {
    for (const kept of [
      'contact?.website_url', 'contact?.Facebook', 'contact?.Instagram', 'contact?.LinkedIn',
      'p.linkedin_url', 'mailto:', 'tel:',
    ]) {
      assert.ok(sheet.includes(kept), `sheet must keep ${kept}`);
    }
  });

  test('descriptive content sections are kept', () => {
    for (const kept of [
      'importerProfile.about', 'importerProfile.origins', 'importerProfile.styles',
      'importerProfile.producers', 'importerProfile.channels', 'importerProfile.contacts',
      'importerProfile.emails', 'importerProfile.commercialNotes', 'importerProfile.confidence',
    ]) {
      assert.ok(sheet.includes(kept), `sheet must keep ${kept}`);
    }
  });

  test('source and import-activity wording stays available for other surfaces', () => {
    assert.equal(importerProfileFr.sources, 'Sources');
    assert.equal(importerProfileFr.importing, 'Activité d’importation');
    assert.equal(importerProfileEn.sources, 'Sources');
    assert.equal(importerProfileEn.importing, 'Import activity');
  });

  test('stored sources and import qualification are still computed from the profile', () => {
    const data: ImporterProfileData = {
      enrichment: {
        description_fr: 'Importateur établi.', description_en: 'Established importer.',
        confidence: 'high', status: 'verified', direct_import_status: 'confirmed_direct_import',
        source_urls: ['https://example.com/about'],
      },
      people: [{ id: 'p1', full_name: 'Jane Doe', source_url: 'https://example.com/about', confidence: 'high' }],
      emails: [{ id: 'e1', email: 'sales@example.com', source_url: null, confidence: 'medium' }],
      evidence: [{ field_name: 'direct_import_status', field_value: 'confirmed_direct_import', confidence: 'high', source_url: 'https://example.com/imports' }],
    };
    assert.deepEqual(profileSources(data), ['https://example.com/about', 'https://example.com/imports']);
    assert.equal(importLabel(data.enrichment!, data.evidence), 'confirmed');
  });
});
