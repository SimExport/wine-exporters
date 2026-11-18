// React-free helpers for the admin send queue. Slots (10:00 and 15:00 Europe/Paris) are reserved
// server-side in campaign_send_queue.scheduled_at; the browser only displays them, never estimates.

const PARIS_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' });
const PARIS_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Paris', hour12: false,
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
});

function parisOffsetMs(at: Date): number {
  const p = Object.fromEntries(PARIS_PARTS.formatToParts(at).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - at.getTime();
}

/** UTC instant of the start of the Paris civil day containing `now`. */
export function parisDayStart(now: Date = new Date()): Date {
  const [y, m, d] = PARIS_DAY.format(now).split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d);
  let start = guess - parisOffsetMs(new Date(guess));
  const off = parisOffsetMs(new Date(start));
  if (start !== guess - off) start = guess - off;
  return new Date(start);
}

/** Formats a reserved slot (UTC ISO) as Paris wall-clock date + time, e.g. "18/11/2026 10:00" (DST-aware). */
export function formatParisSlot(iso: string | null | undefined, locale = 'fr-FR'): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(locale.startsWith('en') ? 'en-GB' : 'fr-FR', {
    timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d).replace(',', '');
}
