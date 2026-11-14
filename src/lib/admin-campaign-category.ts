// React-free: admin-only review category derived from campaigns.status + campaign_send_queue.state.
// Never written to the database; producers keep seeing their usual status.
import { sendState } from './campaign-send-state';

export type AdminCategory = 'to_review' | 'to_check' | 'scheduled' | 'sent' | 'other';
export interface QueueRowLite { campaign_id: string; state: string; approved_at?: string | null; error?: string | null }
interface CampaignLite { status?: string | null; email_content?: unknown; message_html?: string | null;
  brevo_campaign_id?: number | string | null; send_started_at?: string | null; send_error?: string | null }

const SENT = new Set(['active', 'sending', 'results']);

export function adminCategory(c: CampaignLite, q: QueueRowLite | null | undefined): AdminCategory {
  if (SENT.has(String(c.status))) return 'sent';
  if (c.status !== 'pending_validation') return 'other';
  if (q?.state === 'needs_review') return 'to_check';
  if (q?.state === 'queued' || q?.state === 'sending') return 'scheduled';
  if (sendState(c) !== 'idle' && sendState(c) !== 'failed') return 'to_check';
  return 'to_review'; // no queue row, or queue 'failed'
}

export function countByCategory<T extends CampaignLite & { id: string }>(rows: T[], queue: Record<string, QueueRowLite>) {
  const out: Record<AdminCategory, number> = { to_review: 0, to_check: 0, scheduled: 0, sent: 0, other: 0 };
  for (const r of rows) out[adminCategory(r, queue[r.id])]++;
  return out;
}

/** 1-based FIFO position among queued rows (same order as the worker), or null. */
export function queuePosition(id: string, queue: Record<string, QueueRowLite>): number | null {
  const queued = Object.values(queue).filter((q) => q.state === 'queued')
    .sort((a, b) => String(a.approved_at).localeCompare(String(b.approved_at)) || a.campaign_id.localeCompare(b.campaign_id));
  const i = queued.findIndex((q) => q.campaign_id === id);
  return i < 0 ? null : i + 1;
}
