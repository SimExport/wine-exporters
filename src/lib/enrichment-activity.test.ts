import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { summarizeEnrichmentActivity } from './enrichment-activity';

test('uses today counts sorted by count', () => {
  const s = summarizeEnrichmentActivity(
    [{ country: 'United Kingdom', enriched_count: 7 }, { country: 'Germany', enriched_count: 12 }], []);
  assert.equal(s.period, 'today');
  assert.equal(s.total, 19);
  assert.equal(s.shown[0].country, 'Germany');
});

test('falls back to the last 7 days when nothing today', () => {
  const s = summarizeEnrichmentActivity([], [{ country: 'Germany', enriched_count: 48 }]);
  assert.equal(s.period, 'week');
  assert.equal(s.total, 48);
});

test('shows at most 6 countries then counts the others', () => {
  const rows = Array.from({ length: 8 }, (_, i) => ({ country: `C${i}`, enriched_count: 1 }));
  const s = summarizeEnrichmentActivity(rows, []);
  assert.equal(s.shown.length, 6);
  assert.equal(s.otherCountries, 2);
});
