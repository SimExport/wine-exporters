// React-free helpers for the producer dashboard (Lot A). Pure, unit-tested.
import { format } from 'date-fns';

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

const ts = (c: DashboardCampaign) => new Date(c.created_at).getTime();
const latest = (list: DashboardCampaign[]) => [...list].sort((a, b) => ts(b) - ts(a))[0];
const IN_FLIGHT = new Set(['sending', 'active', 'approved', 'pending_validation']);

/** Most recently created in-flight campaign (sending/active/approved/pending); otherwise the latest results. */
export function pickCampaignCard(campaigns: DashboardCampaign[]): { state: CampaignCardState; campaign: DashboardCampaign | null } {
  const inFlight = campaigns.filter((c) => IN_FLIGHT.has(c.status));
  const pick = inFlight.length ? latest(inFlight) : latest(campaigns.filter((c) => c.status === 'results'));
  return pick ? { state: pick.status as CampaignCardState, campaign: pick } : { state: 'none', campaign: null };
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

/** Closed once the deadline day is before today's local calendar day (a deadline today is still open). */
export function isTenderClosed(deadline: string | null, now: Date = new Date()): boolean {
  if (!deadline) return false;
  const day = /^\d{4}-\d{2}-\d{2}/.test(deadline) ? deadline.slice(0, 10) : format(new Date(deadline), 'yyyy-MM-dd');
  return day < format(now, 'yyyy-MM-dd');
}

export function countActiveOpportunities(importerCount: number, tenderDeadlines: Array<string | null>, now: Date = new Date()): number {
  return importerCount + tenderDeadlines.filter((d) => !isTenderClosed(d, now)).length;
}

export interface ProfileFields { domain_name: string | null; contact_name: string | null; location: string | null; priority_markets: string | null }
export function isProfileComplete(p: ProfileFields | null): boolean {
  return !!(p?.domain_name && p.contact_name && p.location && p.priority_markets);
}
