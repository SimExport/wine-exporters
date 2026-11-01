// React-free helpers for the producer dashboard (Lot B). Pure, unit-tested.
import { format } from 'date-fns';

export interface ActionLead {
  id: string;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  country: string | null;
  prospect_status: string | null;
  archived_at: string | null;
  remind_at: string | null;
  remind_note: string | null;
  next_action: string | null;
  next_action_at: string | null; // DATE (yyyy-MM-dd)
}

export interface PriorityAction {
  lead: ActionLead;
  /** 'overdue' = due before today's local day; 'today' = due today (local). */
  when: 'overdue' | 'today';
  /** Earliest due moment, used for sorting (oldest first). */
  dueAt: number;
  /** Text written by the producer (remind_note / next_action), never invented. */
  note: string | null;
  kind: 'reminder' | 'nextAction';
}

const localDay = (d: Date) => format(d, 'yyyy-MM-dd');
const clean = (s: string | null) => (s && s.trim() ? s.trim() : null);
/** Local midnight of a DATE column value (no UTC shift). */
const dateToLocal = (day: string) => {
  const [y, m, d] = day.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
};

export function getPriorityActions(leads: ActionLead[], now: Date = new Date()): PriorityAction[] {
  const today = localDay(now);
  const out: PriorityAction[] = [];
  for (const lead of leads) {
    if (lead.archived_at || lead.prospect_status === 'won' || lead.prospect_status === 'lost') continue;
    const remindDue = !!lead.remind_at && new Date(lead.remind_at).getTime() <= now.getTime();
    const nextDay = lead.next_action_at ? lead.next_action_at.slice(0, 10) : null;
    const nextDue = !!nextDay && nextDay <= today;
    if (!remindDue && !nextDue) continue;

    const overdue = (remindDue && localDay(new Date(lead.remind_at!)) < today) || (nextDue && nextDay! < today);
    const times = [remindDue ? new Date(lead.remind_at!).getTime() : Infinity, nextDue ? dateToLocal(nextDay!) : Infinity];
    const remindNote = remindDue ? clean(lead.remind_note) : null;
    const nextNote = nextDue ? clean(lead.next_action) : null;
    const note = remindNote ?? nextNote;
    const kind = remindNote ? 'reminder' : nextNote ? 'nextAction' : remindDue ? 'reminder' : 'nextAction';
    out.push({ lead, when: overdue ? 'overdue' : 'today', dueAt: Math.min(...times), note, kind });
  }
  return out.sort((a, b) => (a.when === b.when ? a.dueAt - b.dueAt : a.when === 'overdue' ? -1 : 1));
}

export function leadDisplayName(l: Pick<ActionLead, 'company_name' | 'first_name' | 'last_name'>): string | null {
  return clean(l.company_name) ?? clean([l.first_name, l.last_name].filter(Boolean).join(' '));
}

export interface InterestedContact {
  id: string;
  campaign_id: string;
  company_name: string | null;
  country: string | null;
  score: number | null;
  origin: string | null;
  description: string | null;
  created_at: string;
}

/** Qualified prospects: only from the producer's own campaigns in status 'results', score >= 6, non-empty description, click/form origin. Newest first. */
export function pickQualifiedProspects(contacts: InterestedContact[], resultsCampaignIds: Set<string>, limit = 3): InterestedContact[] {
  return contacts
    .filter((c) => resultsCampaignIds.has(c.campaign_id) && (c.score ?? 0) >= 6 && !!clean(c.description) && (c.origin === 'click' || c.origin === 'form'))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}
