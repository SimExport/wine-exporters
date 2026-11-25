import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchCautions, matchReasons, orderByRecommendation, parseMatchesResponse, recommendationIndex, selectRecommended, type OpportunityMatch } from './opportunity-matches';

const m = (c: Partial<OpportunityMatch>): OpportunityMatch => ({ opportunity_type: 'request', opportunity_id: 'x', category: 'forte', scope: 'domain', priority: 50, reasons: [], cautions: [], deadline: null, upcoming: false, matching_wine_id: null, ...c });

test('invalid payload fails closed (caller falls back to all opportunities)', () => {
  assert.throws(() => parseMatchesResponse(null));
  assert.throws(() => parseMatchesResponse({ error: 'forbidden' }));
  assert.deepEqual(parseMatchesResponse({ matches: [{ opportunity_type: 'bad', opportunity_id: 'a', category: 'forte' }], generated_at: 'x' }), []);
});

test('non_compatible and hors_delai are never recommended; request maps to importer key', () => {
  const index = recommendationIndex([m({ opportunity_id: 'a' }), m({ opportunity_id: 'b', category: 'non_compatible' }), m({ opportunity_id: 'c', category: 'hors_delai' }), m({ opportunity_type: 'tender', opportunity_id: 'd', category: 'a_explorer' })]);
  assert.deepEqual([...index.keys()].sort(), ['importer:a', 'tender:d']);
});

test('order is forte, ouverte, à explorer, then priority desc; unmatched rows excluded', () => {
  const index = recommendationIndex([
    m({ opportunity_id: 'e1', category: 'a_explorer', priority: 99 }),
    m({ opportunity_id: 'o1', category: 'ouverte', priority: 10 }),
    m({ opportunity_id: 'f1', category: 'forte', priority: 20 }),
    m({ opportunity_id: 'f2', category: 'forte', priority: 80 }),
    m({ opportunity_id: 'o2', category: 'ouverte', priority: 70 }),
  ]);
  const rows = ['e1', 'o1', 'f1', 'nope', 'f2', 'o2'].map(id => ({ id }));
  assert.deepEqual(selectRecommended(rows, 'importer', index).map(r => r.id), ['f2', 'f1', 'o2', 'o1', 'e1']);
  assert.deepEqual(selectRecommended(rows, 'tender', index), []);
});

test('ranking is reapplied after existing filters that removed rows', () => {
  const index = recommendationIndex([m({ opportunity_type: 'tender', opportunity_id: 'a', category: 'ouverte' }), m({ opportunity_type: 'tender', opportunity_id: 'b', category: 'forte' })]);
  assert.deepEqual(orderByRecommendation([{ id: 'a' }, { id: 'b' }], 'tender', index).map(r => r.id), ['b', 'a']);
  assert.deepEqual(orderByRecommendation([{ id: 'a' }], 'tender', index).map(r => r.id), ['a']);
});

test('tender cautions: upcoming calendar, missing deadline, administrative requirements unverified', () => {
  assert.deepEqual(matchCautions(m({ opportunity_type: 'tender', deadline: null }), {}).keys, ['deadlineMissing', 'adminUnverified']);
  assert.deepEqual(matchCautions(m({ opportunity_type: 'tender', upcoming: true }), {}).keys, ['upcoming', 'adminUnverified']);
  assert.deepEqual(matchCautions(m({ deadline: null }), {}).keys, []);
  const r = matchCautions(m({ cautions: ['unknown_code', 'Volume minimum à confirmer'] }), {});
  assert.deepEqual(r.texts, ['Volume minimum à confirmer']);
});

test('at most two reasons, untranslated codes hidden, no score shown', () => {
  const tr = (c: string) => (c === 'style_match' ? 'Style recherché' : null);
  assert.deepEqual(matchReasons(m({ reasons: ['style_match', 'mystery_code', 'Origine Bordeaux', 'Troisième'] }), tr), ['Style recherché', 'Origine Bordeaux']);
});
