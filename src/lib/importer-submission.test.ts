import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPublication, translateList, normalizeCompany, RELAY_EMAIL, type Submission } from './importer-submission.ts';

const base: Submission = {
  id: '1', created_at: '2026-10-01T10:00:00Z', full_name: 'Anna Berg', company_name: 'Nordic Vin AB', country: 'Sweden',
  email: 'anna@nordic.se', phone: '+46 1', sample_address: 'Secret street 1', wine_styles: 'Red, Sparkling', origins: 'France, Other Europe',
  volume: 'Not known yet', price_range: '5-8 EUR', requirements: 'Organic Loire', consent_publish: true, consent_direct_contact: false, locale: 'en',
};

test('without direct consent, private contacts are replaced by the relay', () => {
  const p = buildPublication(base);
  assert.equal(p.email, RELAY_EMAIL);
  assert.equal(p.full_name, 'WineExporters — contact modéré');
  assert.equal(p.phone, null);
  const all = JSON.stringify(p);
  assert.ok(!all.includes('anna@nordic.se') && !all.includes('Anna Berg') && !all.includes('Secret street') && !all.includes('+46'));
  assert.match(p.requirements_en!, /forwarded/);
});

test('with direct consent, real contacts are published (never the sample address)', () => {
  const p = buildPublication({ ...base, consent_direct_contact: true });
  assert.equal(p.email, 'anna@nordic.se');
  assert.equal(p.phone, '+46 1');
  assert.ok(!JSON.stringify(p).includes('Secret street'));
});

test('price kept in requirements, lists translated, dates set', () => {
  const p = buildPublication(base);
  assert.match(p.requirements_fr!, /Budget \(EXW\) : 5-8 EUR/);
  assert.match(p.requirements_fr!, /\[Texte original en anglais\] Organic Loire/);
  assert.equal(p.wine_styles_fr, 'Rouge, Effervescent');
  assert.equal(p.origins_fr, 'France, Autre Europe');
  assert.equal(p.submitted_at, base.created_at);
  assert.equal(p.status, 'published');
});

test('helpers', () => {
  assert.equal(translateList('Germany, Red'), 'Germany, Rouge');
  assert.equal(normalizeCompany('Nordic Vin AB'), normalizeCompany('nordic vin'));
});

test('translateList keeps 600–1,800 volume whole', () => {
  assert.equal(translateList('600–1,800 bottles / year'), '600–1 800 bouteilles / an');
});
test('translateList keeps 1,800–10,000 volume whole', () => {
  assert.equal(translateList('1,800–10,000 bottles / year'), '1 800–10 000 bouteilles / an');
});
