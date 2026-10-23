import { describe, it, expect } from 'vitest';
import { summarizeEnrichmentActivity } from './enrichment-activity';

describe('summarizeEnrichmentActivity', () => {
  it('uses today counts sorted by count', () => {
    const s = summarizeEnrichmentActivity(
      [{ country: 'United Kingdom', enriched_count: 7 }, { country: 'Germany', enriched_count: 12 }], []);
    expect(s.period).toBe('today');
    expect(s.total).toBe(19);
    expect(s.shown[0].country).toBe('Germany');
  });
  it('falls back to the last 7 days when nothing today', () => {
    const s = summarizeEnrichmentActivity([], [{ country: 'Germany', enriched_count: 48 }]);
    expect(s.period).toBe('week');
    expect(s.total).toBe(48);
  });
  it('shows at most 6 countries then counts the others', () => {
    const rows = Array.from({ length: 8 }, (_, i) => ({ country: `C${i}`, enriched_count: 1 }));
    const s = summarizeEnrichmentActivity(rows, []);
    expect(s.shown).toHaveLength(6);
    expect(s.otherCountries).toBe(2);
  });
});
