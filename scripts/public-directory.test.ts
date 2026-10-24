import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { APPROVED_PUBLIC_COMPANIES, projectPublicDirectory, type PublicationCandidate } from './public-directory';
import { DIRECTORY_COUNTRIES } from '../src/lib/directory-countries';

// Synthetic fixtures only; these are not real businesses or publication candidates.
const candidate = (slug = 'fixture', countryCode = 'US'): PublicationCandidate => ({
  existingCompanyId: 'fixture-id',
  approval: { editorial: true, rights: true, approvedAt: '2026-10-24', evidence: 'Synthetic rights fixture' },
  publicFields: { slug, countryCode, name: 'Synthetic fixture', description: 'Synthetic public description', website: 'https://example.org', sources: ['https://example.org/about'] },
});
test('no real companies are approved for publication in this V1', () => assert.deepEqual(projectPublicDirectory(APPROVED_PUBLIC_COMPANIES), []));
test('both rights and explicit editorial approval are required', () => {
  const noRights = candidate(); noRights.approval.rights = false;
  const noEditorial = candidate(); noEditorial.approval.editorial = false;
  assert.equal(projectPublicDirectory([noRights, noEditorial]).length, 0);
});
test('only the six requested countries are accepted', () => {
  assert.deepEqual(DIRECTORY_COUNTRIES.map(country => country.code), ['US', 'UK', 'DE', 'BE', 'JP', 'CA']);
  assert.equal(projectPublicDirectory([candidate('fixture', 'FR')]).length, 0);
});
test('at most five companies per country and thirty overall', () => {
  const rows = DIRECTORY_COUNTRIES.flatMap(country => Array.from({ length: 8 }, (_, i) => candidate(`fixture-${i}`, country.code)));
  const projected = projectPublicDirectory(rows);
  assert.equal(projected.length, 30);
  for (const country of DIRECTORY_COUNTRIES) assert.equal(projected.filter(row => row.countryCode === country.code).length, 5);
});
test('unknown private fields and approval metadata never reach the public projection', () => {
  const row = candidate();
  Object.assign(row.publicFields, { email: 'private@example.org', phone: '+33123456789', full_name: 'Private person', commercial_notes: 'Internal', enrichment: { secret: true } });
  assert.deepEqual(Object.keys(projectPublicDirectory([row])[0]).sort(), ['slug', 'countryCode', 'name', 'description', 'website', 'sources'].sort());
});
test('missing evidence, sparse descriptions and contact-like text fail closed', () => {
  const noEvidence = candidate(); noEvidence.approval.evidence = '';
  const sparse = candidate(); sparse.publicFields.description = '';
  const email = candidate(); email.publicFields.description = 'Write to private@example.org';
  const phone = candidate(); phone.publicFields.description = 'Call +33 1 23 45 67 89';
  assert.deepEqual(projectPublicDirectory([noEvidence, sparse, email, phone]), []);
});