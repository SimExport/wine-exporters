// React-free helpers for the producer dashboard (Lot A). Pure, unit-tested.
import { differenceInDays } from 'date-fns';

export interface DashboardCampaign {
  id: string;
  name: string;
  status: string;
  target_markets: string[] | null;
  launched_at: string | null;
  created_at: string;
  validation_requested_at?: string | null;
}

export type CampaignCardState = 'sending' | 'active' | 'approved' | 'pending_validation' | 'results' | 'none';

const ts = (c: DashboardCampaign) => new Date(c.launched_at ?? c.created_at).getTime();
const latest = (list: DashboardCampaign[]) => [...list].sort((a, b) => ts(b) - ts(a))[0];

/** Most relevant campaign for the producer: in progress > validated > awaiting validation > latest results. */
export function pickCampaignCard(campaigns: DashboardCampaign[]): { state: CampaignCardState; campaign: DashboardCampaign | null } {
  for (const state of ['sending', 'active', 'approved', 'pending_validation', 'results'] as const) {
    const match = campaigns.filter((c) => c.status === state);
    if (match.length) return { state, campaign: latest(match) };
  }
  return { state: 'none', campaign: null };
}

const NOT_SUBMITTED = new Set(['draft', 'manual']);
/** A campaign counts as submitted only once it left draft (manual CRM containers never count). */
export function isSubmittedCampaign(c: Pick<DashboardCampaign, 'status' | 'validation_requested_at'>): boolean {
  if (NOT_SUBMITTED.has(c.status)) return false;
  if (c.status === 'archived') return !!c.validation_requested_at;
  return true;
}

export interface PipelineSummary { newProspects: number; samples: number; negotiation: number; won: number; open: number }

export function summarizePipeline(statuses: Array<string | null>): PipelineSummary {
  const s: PipelineSummary = { newProspects: 0, samples: 0, negotiation: 0, won: 0, open: 0 };
  for (const st of statuses) {
    if (st === 'new') s.newProspects++;
    else if (st === 'samples_requested' || st === 'samples_sent' || st === 'received' || st === 'tasted') s.samples++;
    else if (st === 'negotiation') s.negotiation++;
    else if (st === 'won') s.won++;
    if (st !== 'won' && st !== 'lost') s.open++;
  }
  return s;
}

/** Same rule as the deadline badge on /opportunites: closed once differenceInDays(deadline, now) < 0. */
export function isTenderClosed(deadline: string | null, now: Date = new Date()): boolean {
  if (!deadline) return false;
  return differenceInDays(new Date(deadline), now) < 0;
}

export function countActiveOpportunities(importerCount: number, tenderDeadlines: Array<string | null>, now: Date = new Date()): number {
  return importerCount + tenderDeadlines.filter((d) => !isTenderClosed(d, now)).length;
}

export interface ProfileFields { domain_name: string | null; contact_name: string | null; location: string | null; priority_markets: string | null }
export function isProfileComplete(p: ProfileFields | null): boolean {
  return !!(p?.domain_name && p.contact_name && p.location && p.priority_markets);
}
