import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_TENDER_FILTERS, fetchAllTenderPages, filterTenders, tenderDeadline, tenderDeadlineState, tenderFilterOptions, tenderMarket, tenderPage, tenderWineKeys, type DiscoverableTender } from './tender-discovery';

const now = new Date('2026-11-24T12:00:00Z');
const row = (changes: Partial<DiscoverableTender> = {}): DiscoverableTender => ({ id: 'one', reference: 'REF-ÉTÉ-42', market: 'Vinmonopolet (Norvège)', category: 'Red wine', category_fr: 'Vin rouge', category_en: 'Red Wine', designation_origin_fr: 'Côtes-du-Rhône', designation_origin_en: 'Rhone Valley', style_profile_fr: 'Élégant et boisé', style_profile_en: 'Full-bodied', requirements_fr: 'Certifié biologique', requirements_en: 'Sustainable production', deadline_answer: '2026-11-25', ...changes });

test('search is case/accent insensitive in reference and every FR/EN searchable field', () => {
  for (const q of ['ref ete 42', 'COTES du RHONE', 'rhone valley', 'norvege', 'norway', 'VIN ROUGE', 'red wine', 'ELEGANT BOISE', 'full bodied', 'certifie biologique', 'sustainable production']) {
    assert.equal(filterTenders([row()], { ...EMPTY_TENDER_FILTERS, q }, now).length, 1, q);
  }
  assert.equal(filterTenders([row()], { ...EMPTY_TENDER_FILTERS, q: 'rioja' }, now).length, 0);
});

test('country/language variants group by monopoly without merging different Swedish buyers', () => {
  assert.equal(tenderMarket('Vinmonopolet (Norvège)').key, tenderMarket('Vinmonopolet (Norway)').key);
  assert.equal(tenderMarket(' LCBO Vintages (Canada) ').key, tenderMarket('LCBO (Ontario, Canada)').key);
  assert.notEqual(tenderMarket('Systembolaget (Suède)').key, tenderMarket('Wineability (Suède)').key);
  assert.equal(tenderMarket('Suède').key, tenderMarket('Sweden').key);
});

test('wine filters normalize FR/EN case and compound sparkling colours', () => {
  assert.deepEqual(tenderWineKeys(row()), ['red']);
  assert.deepEqual(tenderWineKeys(row({ category: 'Rosé Wine', category_fr: 'Vin Rosé', category_en: 'Rosé wine' })), ['rose']);
  assert.deepEqual(tenderWineKeys(row({ category: 'Effervescent rosé', category_fr: null, category_en: 'Sparkling rosé' })), ['sparkling', 'rose']);
  assert.deepEqual(tenderWineKeys(row({ category: 'Sweet Wine', category_fr: 'Vin liquoreux', category_en: null })), ['sweet']);
});

test('market and wine options deduplicate across languages and keep unknown categories usable', () => {
  const rows = [row(), row({ id: 'two', market: 'Vinmonopolet (Norway)' }), row({ id: 'three', category: 'Cuvée spéciale', category_fr: null, category_en: null })];
  const fr = tenderFilterOptions(rows, 'fr', key => key);
  const en = tenderFilterOptions(rows, 'en', key => key);
  assert.equal(fr.markets.length, 1);
  assert.equal(en.markets.length, 1);
  assert.equal(fr.markets[0]?.label, 'Vinmonopolet (Norvège)');
  assert.equal(en.markets[0]?.label, 'Vinmonopolet (Norway)');
  assert.deepEqual(fr.wines.map(option => option.key).sort(), ['raw:cuvee speciale', 'red']);
});

test('filters combine by intersection, not union', () => {
  const rows = [row(), row({ id: 'other', market: 'Alko (Finlande)' }), row({ id: 'expired', deadline_answer: '2026-11-23' })];
  const filters = { ...EMPTY_TENDER_FILTERS, q: 'biologique', market: tenderMarket(row().market).key, wine: 'red', deadline: 'open' as const };
  assert.deepEqual(filterTenders(rows, filters, now).map(item => item.id), ['one']);
  assert.equal(filterTenders(rows, { ...filters, wine: 'white' }, now).length, 0);
});

test('past dates are expired even less than 24 hours ago, today remains open', () => {
  assert.equal(tenderDeadlineState(row({ deadline_answer: '2026-11-23' }), new Date('2026-11-24T00:05:00Z')), 'expired');
  assert.equal(tenderDeadlineState(row({ deadline_answer: '2026-11-24' }), now), 'open');
});

test('day-only expiration follows Paris in winter and summer', () => {
  assert.equal(tenderDeadlineState(row({ deadline_answer: '2026-11-24' }), new Date('2026-11-24T23:05:00Z')), 'expired');
  assert.equal(tenderDeadlineState(row({ deadline_answer: '2026-06-24' }), new Date('2026-06-24T22:05:00Z')), 'expired');
  assert.equal(tenderDeadlineState(row({ deadline_answer: '2026-06-24' }), new Date('2026-06-24T21:55:00Z')), 'open');
});

test('missing, invalid or ambiguous deadlines are unconfirmed and never open', () => {
  for (const deadline_answer of [null, '', 'À confirmer', '2026-02-30', '11/12/26', '2026-11-24T12:00:00']) {
    assert.equal(tenderDeadlineState(row({ deadline_answer }), now), 'unconfirmed');
    assert.equal(tenderDeadline(deadline_answer), null);
  }
  assert.equal(filterTenders([row({ deadline_answer: null })], { ...EMPTY_TENDER_FILTERS, deadline: 'open' }, now).length, 0);
});

test('explicit timestamp is expired immediately after its actual time', () => {
  assert.equal(tenderDeadlineState(row({ deadline_answer: '2026-11-24T11:59:00Z' }), now), 'expired');
  assert.equal(tenderDeadlineState(row({ deadline_answer: '2026-11-24T13:01:00+01:00' }), now), 'open');
});

test('deadline filters separate open, expired and missing values without dropping any row', () => {
  const rows = [row({ id: 'open' }), row({ id: 'expired', deadline_answer: '2026-11-23' }), row({ id: 'unknown', deadline_answer: null })];
  assert.deepEqual(filterTenders(rows, { ...EMPTY_TENDER_FILTERS, deadline: 'open' }, now).map(item => item.id), ['open']);
  assert.deepEqual(filterTenders(rows, { ...EMPTY_TENDER_FILTERS, deadline: 'expired' }, now).map(item => item.id), ['expired']);
  assert.deepEqual(filterTenders(rows, { ...EMPTY_TENDER_FILTERS, deadline: 'unconfirmed' }, now).map(item => item.id), ['unknown']);
});

test('sort is chronological in both directions, with missing dates always last and input unchanged', () => {
  const rows = [row({ id: 'unknown', deadline_answer: null }), row({ id: 'later', deadline_answer: '2027-01-01' }), row({ id: 'earlier', deadline_answer: '2026-11-23' })];
  assert.deepEqual(filterTenders(rows, EMPTY_TENDER_FILTERS, now).map(item => item.id), ['earlier', 'later', 'unknown']);
  assert.deepEqual(filterTenders(rows, { ...EMPTY_TENDER_FILTERS, sort: 'deadline_desc' }, now).map(item => item.id), ['later', 'earlier', 'unknown']);
  assert.deepEqual(rows.map(item => item.id), ['unknown', 'later', 'earlier']);
});

test('search precedes pagination across hundreds of rows; pages contain ten results', () => {
  const rows = Array.from({ length: 350 }, (_, n) => row({ id: String(n), reference: `REF-${n}`, requirements_en: n === 349 ? 'unique criterion' : 'other' }));
  assert.equal(tenderPage(filterTenders(rows, EMPTY_TENDER_FILTERS, now), 1).rows.length, 10);
  assert.equal(tenderPage(rows, 1).pages, 35);
  const matches = filterTenders(rows, { ...EMPTY_TENDER_FILTERS, q: 'unique criterion' }, now);
  assert.equal(tenderPage(matches, 1).rows[0]?.id, '349');
  assert.equal(tenderPage(matches, 35).page, 1);
  assert.equal(tenderPage([], 35).rows.length, 0);
});

test('loader ranges cover the entire dataset beyond Supabase default cap', async () => {
  const rows = Array.from({ length: 1250 }, (_, n) => ({ id: n }));
  const ranges: number[][] = [];
  const all = await fetchAllTenderPages(async (from, to) => { ranges.push([from, to]); return { data: rows.slice(from, to + 1), error: null }; });
  assert.equal(all.length, 1250);
  assert.equal(all[1249]?.id, 1249);
  assert.deepEqual(ranges.at(-1), [1200, 1399]);
});

test('failed later batch rejects instead of returning partial searchable results', async () => {
  await assert.rejects(() => fetchAllTenderPages(async from => ({ data: from === 0 ? Array(200).fill(row()) : null, error: from === 0 ? null : new Error('unavailable') })), /unavailable/);
});

test('reset removes every filter and restores the initial ordering', () => {
  assert.equal(filterTenders([row(), row({ id: 'expired', deadline_answer: '2026-11-23' })], { ...EMPTY_TENDER_FILTERS }, now).length, 2);
  assert.deepEqual(EMPTY_TENDER_FILTERS, { q: '', market: '', wine: '', deadline: '', sort: 'deadline_asc' });
});