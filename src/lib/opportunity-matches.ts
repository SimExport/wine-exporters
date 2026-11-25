import type { OpportunityType } from './opportunity-archives';

/** Deterministic matches returned by the `we-opportunity-matches` Edge Function (no AI on the client). */
export type MatchCategory = 'forte' | 'ouverte' | 'a_explorer' | 'non_compatible' | 'hors_delai';
export interface OpportunityMatch {
  opportunity_type: 'request' | 'tender';
  opportunity_id: string;
  category: MatchCategory;
  scope: string;
  priority: number;
  reasons: string[];
  cautions: string[];
  deadline: string | null;
  upcoming: boolean;
  matching_wine_id: string | null;
}
export type RecommendedCategory = 'forte' | 'ouverte' | 'a_explorer';
export const RECOMMENDED_CATEGORIES: readonly RecommendedCategory[] = ['forte', 'ouverte', 'a_explorer'];
const CATEGORIES: readonly MatchCategory[] = [...RECOMMENDED_CATEGORIES, 'non_compatible', 'hors_delai'];

const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.trim() !== '').map(v => v.trim()) : [];

/** Fail closed: an unexpected payload is treated as an error so opportunities are never hidden. */
export function parseMatchesResponse(payload: unknown): OpportunityMatch[] {
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { matches?: unknown }).matches)) throw new Error('invalid_matches_payload');
  const out: OpportunityMatch[] = [];
  for (const raw of (payload as { matches: unknown[] }).matches) {
    if (!raw || typeof raw !== 'object') continue;
    const m = raw as Record<string, unknown>;
    if ((m.opportunity_type !== 'request' && m.opportunity_type !== 'tender') || typeof m.opportunity_id !== 'string' || !m.opportunity_id) continue;
    if (!CATEGORIES.includes(m.category as MatchCategory)) continue;
    out.push({
      opportunity_type: m.opportunity_type,
      opportunity_id: m.opportunity_id,
      category: m.category as MatchCategory,
      scope: typeof m.scope === 'string' ? m.scope : '',
      priority: typeof m.priority === 'number' && Number.isFinite(m.priority) ? m.priority : 0,
      reasons: strings(m.reasons),
      cautions: strings(m.cautions),
      deadline: typeof m.deadline === 'string' && m.deadline ? m.deadline : null,
      upcoming: m.upcoming === true,
      matching_wine_id: typeof m.matching_wine_id === 'string' ? m.matching_wine_id : null,
    });
  }
  return out;
}

/** Endpoint `request` maps to the UI `importer` key; `tender` stays `tender`. */
export const matchUiType = (type: OpportunityMatch['opportunity_type']): OpportunityType => type === 'request' ? 'importer' : 'tender';
export const matchKey = (type: OpportunityType, id: string) => `${type}:${id}`;

export const isRecommended = (m: OpportunityMatch): m is OpportunityMatch & { category: RecommendedCategory } => (RECOMMENDED_CATEGORIES as readonly string[]).includes(m.category);

/** Index of recommended matches only; non_compatible / hors_delai never enter it. Keeps the best match per opportunity. */
export function recommendationIndex(matches: OpportunityMatch[]): Map<string, OpportunityMatch & { category: RecommendedCategory }> {
  const index = new Map<string, OpportunityMatch & { category: RecommendedCategory }>();
  for (const m of matches) {
    if (!isRecommended(m)) continue;
    const key = matchKey(matchUiType(m.opportunity_type), m.opportunity_id);
    const current = index.get(key);
    if (!current || compareMatches(m, current) < 0) index.set(key, m);
  }
  return index;
}

const rank = (c: MatchCategory) => { const i = (RECOMMENDED_CATEGORIES as readonly string[]).indexOf(c); return i < 0 ? 99 : i; };
export const compareMatches = (a: OpportunityMatch, b: OpportunityMatch) => rank(a.category) - rank(b.category) || b.priority - a.priority;

/** Recommended subset of `rows`, ordered forte → ouverte → à explorer, then priority desc (stable otherwise). */
export function selectRecommended<T extends { id: string }>(rows: T[], type: OpportunityType, index: Map<string, OpportunityMatch>): T[] {
  return rows
    .map((row, position) => ({ row, position, match: index.get(matchKey(type, row.id)) }))
    .filter((x): x is { row: T; position: number; match: OpportunityMatch } => Boolean(x.match))
    .sort((a, b) => compareMatches(a.match, b.match) || a.position - b.position)
    .map(x => x.row);
}

/** Re-applies the recommendation order after existing filters (which may sort), keeping only rows still present. */
export function orderByRecommendation<T extends { id: string }>(rows: T[], type: OpportunityType, index: Map<string, OpportunityMatch>): T[] {
  return selectRecommended(rows, type, index);
}

export type CautionKey = 'upcoming' | 'deadlineMissing' | 'adminUnverified';
const CODE_RE = /^[a-z0-9]+(?:[_.-][a-z0-9]+)*$/;

/**
 * Cautions shown on a recommended card. Important ones are derived from structured fields so the wording stays
 * prudent and localized: next calendar announced, missing tender closing date, administrative requirements unverified.
 * Free-text server cautions are kept; unknown technical codes are dropped rather than shown raw.
 */
export function matchCautions(m: OpportunityMatch, knownCodes: Record<string, CautionKey>): { keys: CautionKey[]; texts: string[] } {
  const keys = new Set<CautionKey>();
  if (m.upcoming) keys.add('upcoming');
  if (m.opportunity_type === 'tender' && !m.deadline && !m.upcoming) keys.add('deadlineMissing');
  if (m.opportunity_type === 'tender') keys.add('adminUnverified');
  const texts: string[] = [];
  for (const c of m.cautions) {
    const known = knownCodes[c.toLowerCase()];
    if (known) keys.add(known);
    else if (!CODE_RE.test(c)) texts.push(c);
  }
  return { keys: [...keys], texts: texts.slice(0, 1) };
}

/** At most two reasons; technical codes without translation are not displayed. */
export function matchReasons(m: OpportunityMatch, translate: (code: string) => string | null): string[] {
  const out: string[] = [];
  for (const r of m.reasons) {
    const label = CODE_RE.test(r) ? translate(r.toLowerCase()) : r;
    if (label && !out.includes(label)) out.push(label);
    if (out.length === 2) break;
  }
  return out;
}
