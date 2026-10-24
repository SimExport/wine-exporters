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
test('every reviewed company passes the projection, with the documented count per country', () => {
  const projected = projectPublicDirectory(APPROVED_PUBLIC_COMPANIES);
  assert.equal(projected.length, APPROVED_PUBLIC_COMPANIES.length);
  const perCountry = Object.fromEntries(DIRECTORY_COUNTRIES.map(c => [c.code, projected.filter(r => r.countryCode === c.code).length]));
  assert.deepEqual(perCountry, { US: 8, UK: 10, DE: 4, BE: 4, JP: 4, CA: 5 });
});
test('excluded candidates never reach the public directory', () => {
  const names = projectPublicDirectory(APPROVED_PUBLIC_COMPANIES).map(r => r.name);
  for (const excluded of ['Global Wineries', 'Le Wine', 'Aiko Importers', 'Atherton Wine Imports', 'Hakurai Wine Trading, Inc.', 'Escalade Wines & Spirits']) assert.ok(!names.includes(excluded), excluded);
});
test('both rights and explicit editorial approval are required', () => {
  const noRights = candidate(); noRights.approval.rights = false;
  const noEditorial = candidate(); noEditorial.approval.editorial = false;
  assert.equal(projectPublicDirectory([noRights, noEditorial]).length, 0);
});
test('only the six requested countries are accepted', () => {
  assert.deepEqual(DIRECTORY_COUNTRIES.map(country => country.code), ['US', 'UK', 'DE', 'BE', 'JP', 'CA']);
  assert.equal(projectPublicDirectory([candidate('fixture', 'FR')]).length, 0);
});
test('at most ten companies per country and sixty overall', () => {
  const rows = DIRECTORY_COUNTRIES.flatMap(country => Array.from({ length: 12 }, (_, i) => candidate(`fixture-${i}`, country.code)));
  const projected = projectPublicDirectory(rows);
  assert.equal(projected.length, 60);
  for (const country of DIRECTORY_COUNTRIES) assert.equal(projected.filter(row => row.countryCode === country.code).length, 10);
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