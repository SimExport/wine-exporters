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
export type ReasonKey = 'openToSeveralProfiles' | 'originCompatible' | 'regionCompatible' | 'styleCompatible' | 'priorityMarket' | 'criteriaLight';
const CODE_RE = /^[a-z0-9]+(?:[_.-][a-z0-9]+)*$/;

/** Accent-, case- and punctuation-insensitive form of a server phrase (the service sends unaccented French sentences). */
export const normalizePhrase = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Known French reason sentences sent by `we-opportunity-matches`, mapped to localized labels. */
const REASON_PHRASES: Record<string, ReasonKey> = {
  'demande ouverte a plusieurs types de domaines': 'openToSeveralProfiles',
  'origine du domaine compatible': 'originCompatible',
  'region ou appellation compatible': 'regionCompatible',
  'style de vin compatible': 'styleCompatible',
  'marche prioritaire du domaine': 'priorityMarket',
  'criteres acheteur peu detailles': 'criteriaLight',
};
export const reasonKey = (phrase: string): ReasonKey | null => REASON_PHRASES[normalizePhrase(phrase)] ?? null;

/** Known French caution sentences (and legacy codes), recognised by their key words. */
export function cautionKey(phrase: string): CautionKey | null {
  const n = normalizePhrase(phrase);
  if (/\b(calendrier|calendar|upcoming)\b/.test(n)) return 'upcoming';
  if (/\badministrati/.test(n) || /\badmin\b/.test(n) || (/\bexigences?\b/.test(n) && /\bverifi/.test(n))) return 'adminUnverified';
  if (/\b(cloture|echeance|deadline)\b/.test(n) || (/\bdate\b/.test(n) && /\b(limite|renseignee|manquante|absente|inconnue)\b/.test(n))) return 'deadlineMissing';
  return null;
}

/**
 * Cautions shown on a recommended card. Important ones are derived from structured fields so the wording stays
 * prudent and localized: next calendar announced, missing tender closing date, administrative requirements unverified.
 * Known server sentences are mapped to the same localized keys. Other free-text cautions are French-only, so they are
 * shown only when `allowFreeText` (FR UI); technical codes are never shown raw.
 */
export function matchCautions(m: OpportunityMatch, allowFreeText: boolean): { keys: CautionKey[]; texts: string[] } {
  const keys = new Set<CautionKey>();
  if (m.upcoming) keys.add('upcoming');
  if (m.opportunity_type === 'tender' && !m.deadline && !m.upcoming) keys.add('deadlineMissing');
  if (m.opportunity_type === 'tender') keys.add('adminUnverified');
  const texts: string[] = [];
  for (const c of m.cautions) {
    const known = cautionKey(c);
    if (known) keys.add(known);
    else if (allowFreeText && !CODE_RE.test(c)) texts.push(c);
  }
  return { keys: [...keys], texts: texts.slice(0, 1) };
}

/** At most two reasons. Known sentences are localized; unknown French sentences only appear in the FR UI; codes never. */
export function matchReasons(m: OpportunityMatch, label: (key: ReasonKey) => string, allowFreeText: boolean): string[] {
  const out: string[] = [];
  for (const r of m.reasons) {
    const key = reasonKey(r);
    const text = key ? label(key) : allowFreeText && !CODE_RE.test(r) ? r : null;
    if (text && !out.includes(text)) out.push(text);
    if (out.length === 2) break;
  }
  return out;
}
