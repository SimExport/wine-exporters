// React-free helpers mapping a producer campaign + its send-queue entry (read through the owner-scoped
// get_my_campaign_send_slots RPC) to a display status. Display only: never changes campaigns.status.

export interface SendSlot { campaign_id: string; state: string; scheduled_at: string | null }
export type SlotMap = Map<string, SendSlot>;

/** 'scheduled' | 'sending' | 'send_review' only for pending_validation campaigns with a queue entry; otherwise the stored status. */
export function displayCampaignStatus(status: string, slot: SendSlot | undefined | null): string {
  if (status !== 'pending_validation' || !slot) return status;
  if (slot.state === 'queued') {
    return slot.scheduled_at && !Number.isNaN(new Date(slot.scheduled_at).getTime()) ? 'scheduled' : 'pending_validation';
  }
  if (slot.state === 'sending') return 'sending';
  if (slot.state === 'needs_review' || slot.state === 'failed') return 'send_review';
  return 'pending_validation';
}

/** Long Paris wall-clock format, e.g. "20 novembre 2026 à 10h00" / "20 November 2026 at 10:00". */
export function formatParisSlotLong(iso: string | null | undefined, locale = 'fr'): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const en = locale.startsWith('en');
  const opts = { timeZone: 'Europe/Paris' } as const;
  const date = new Intl.DateTimeFormat(en ? 'en-GB' : 'fr-FR', { ...opts, day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { ...opts, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d).map((x) => [x.type, x.value]));
  const hh = String(+p.hour % 24).padStart(2, '0');
  return en ? `${date} at ${hh}:${p.minute}` : `${date} à ${hh}h${p.minute}`;
}

export function toSlotMap(rows: SendSlot[] | null | undefined): SlotMap {
  return new Map((rows ?? []).map((r) => [r.campaign_id, r]));
}

/** Never throws; on failure returns an empty map so nothing is ever shown as scheduled. */
export async function fetchMySendSlots(client: { rpc: (fn: string) => PromiseLike<{ data: unknown; error: unknown }> }): Promise<SlotMap> {
  try {
    const { data, error } = await client.rpc('get_my_campaign_send_slots');
    if (error) throw error;
    return toSlotMap(data as SendSlot[]);
  } catch (e) {
    console.error('send slots unavailable', e);
    return new Map();
  }
}
