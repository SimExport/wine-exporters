import { opportunityKey, type OpportunityType } from './opportunity-archives';

/** Deep link used by the weekly opportunity email: `/opportunites?weType=direct|tender&weId=<uuid>`. */
export interface OpportunityDeepLink { tab: 'direct' | 'tender'; type: OpportunityType; id: string }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Invalid or partial parameters are ignored so the page always opens normally. */
export function parseOpportunityDeepLink(search: string): OpportunityDeepLink | null {
  const params = new URLSearchParams(search);
  const kind = params.get('weType')?.trim().toLowerCase();
  const id = params.get('weId')?.trim() ?? '';
  if (!UUID_RE.test(id)) return null;
  if (kind === 'direct') return { tab: 'direct', type: 'importer', id: id.toLowerCase() };
  if (kind === 'tender') return { tab: 'tender', type: 'tender', id: id.toLowerCase() };
  return null;
}

export type DeepLinkResolution =
  | { status: 'active'; key: string; mode: 'mine' | 'all' }
  | { status: 'archived'; key: string }
  | { status: 'missing' };

/**
 * Resolves the link against rows the signed-in user could already read (RLS-filtered); nothing is fetched or bypassed.
 * "For my estate" is forced only when suggestions are loaded and this opportunity is one of them; otherwise "All".
 */
export function resolveOpportunityDeepLink(
  link: OpportunityDeepLink,
  rows: readonly { id: string }[],
  archivedKeys: ReadonlySet<string>,
  isRecommended: (key: string) => boolean,
): DeepLinkResolution {
  const row = rows.find(r => r.id.toLowerCase() === link.id);
  if (!row) return { status: 'missing' };
  const key = opportunityKey(link.type, row.id);
  if (archivedKeys.has(key)) return { status: 'archived', key };
  return { status: 'active', key, mode: isRecommended(key) ? 'mine' : 'all' };
}

/** 1-based page that contains `key`, or null when it is not in the displayed list. */
export function pageContaining(rows: readonly { id: string }[], type: OpportunityType, key: string, pageSize: number): number | null {
  const index = rows.findIndex(r => opportunityKey(type, r.id) === key);
  return index < 0 ? null : Math.floor(index / pageSize) + 1;
}
