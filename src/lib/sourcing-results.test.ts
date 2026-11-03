import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { addSourcingProspects, sourcingSelectionIndices } from './sourcing-results';

test('add all includes every page, excluding already completed prospects', () => {
  assert.deepEqual(sourcingSelectionIndices(15, new Set([0, 14])), Array.from({ length: 13 }, (_, i) => i + 1));
});

test('multi-selection adds only selected prospects not already completed', () => {
  assert.deepEqual(sourcingSelectionIndices(15, new Set([3]), new Set([1, 3, 12])), [1, 12]);
});

test('bulk addition processes each prospect once and keeps successes after a failure', async () => {
  const calls: number[] = [];
  const result = await addSourcingProspects([0, 1, 1, 2, 3], async index => {
    calls.push(index);
    if (index === 2) throw new Error('Rejected');
    return index === 1 ? 'existing' : 'added';
  });
  assert.deepEqual(calls, [0, 1, 2, 3]);
  assert.deepEqual(result, { added: 2, existing: 1, completed: [0, 1, 3], failed: [2] });
});
import { safeWebsiteUrl, primaryPerson, portfolioOf, hasConfirmedDirectImport, toProfileContact, exportRow, toCsv, EXPORT_HEADERS, buildSourcingLead, buyerContactId } from './sourcing-results';

const legacy = { company_name: 'Old Co', email: 'a@old.com', phone: '+1', website_url: 'old.com', score: 7, reason: 'Good fit' };
const modern = {
  ...legacy, company_name: 'New "Co"', buyer_contact_id: '6aab5e90-8738-44e3-a797-fe789f32333c', city: 'Berlin', country: 'Allemagne',
  company_type: 'importer', wine_regions: ['Bordeaux', 'Rhône'], wine_appellations: ['Margaux', 'Pauillac'], distribution_channels: ['HoReCa'],
  direct_import_status: 'partial', source_urls: ['https://x.de'],
  decision_makers: [{ full_name: 'Anna B', job_title: 'CEO', business_email: 'anna@x.de' }, { full_name: 'Tom C', job_title: 'Buyer' }],
  preferred_contact: null, additional_emails: ['info@x.de'], description_fr: 'Desc FR',
};

test('website links accept bare domains and reject unsafe schemes', () => {
  assert.equal(safeWebsiteUrl('leons-weinhaus.de'), 'https://leons-weinhaus.de/');
  assert.equal(safeWebsiteUrl('javascript:alert(1)'), null);
  assert.equal(safeWebsiteUrl('not a url'), null);
});

test('legacy shortlist has no fake id, no profile contact, no person', () => {
  assert.equal(buyerContactId(legacy), null);
  assert.equal(toProfileContact(legacy, 'Allemagne'), null);
  assert.equal(primaryPerson(legacy), null);
  assert.deepEqual(portfolioOf(legacy), []);
});

test('modern shortlist exposes real id, decision maker and capped portfolio', () => {
  assert.equal(toProfileContact(modern, 'X')?.id, modern.buyer_contact_id);
  assert.equal(primaryPerson(modern)?.full_name, 'Anna B');
  assert.deepEqual(portfolioOf(modern), ['Bordeaux', 'Rhône', 'Margaux']);
  assert.equal(hasConfirmedDirectImport(modern), false);
  assert.equal(hasConfirmedDirectImport({ ...modern, direct_import_status: 'confirmed' }), true);
});

test('export keeps legacy columns, blanks missing values and escapes CSV', () => {
  const old = exportRow(legacy, 'fr', 'Oui');
  assert.equal(old.length, EXPORT_HEADERS.length);
  assert.deepEqual(old.slice(0, 6), ['Old Co', 'a@old.com', '+1', 'old.com', '7', 'Good fit']);
  assert.ok(old.slice(6).every(v => v === ''));
  const row = exportRow(modern, 'fr', 'Oui');
  assert.ok(!row.join('').includes('[object Object]'));
  assert.equal(row[EXPORT_HEADERS.indexOf('other_decision_makers')], 'Tom C – Buyer');
  assert.ok(toCsv([row]).startsWith('"New ""Co"""'));
});

test('CRM mapping links buyer_contact_id and keeps historic buyer_id', () => {
  const base = { contact: null, campaignId: 'c', marketLabel: 'Allemagne', requestId: 'r', userId: 'u', now: 'n' };
  const lead = buildSourcingLead({ ...base, item: modern });
  assert.equal(lead.buyer_contact_id, modern.buyer_contact_id);
  assert.equal(lead.buyer_id, 'a@old.com');
  assert.equal(lead.source_score, 7);
  assert.equal(lead.source_ref, 'r');
  assert.equal(buildSourcingLead({ ...base, item: legacy }).buyer_contact_id, null);
});
