// React-free helpers for the admin send queue (one real campaign per Paris civil day, FIFO).

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

/** Estimated send date (Paris civil day, yyyy-mm-dd) for a campaign at `position` (1 = next) in the queue. */
export function estimateSendDate(position: number, quotaUsedToday: boolean, now: Date = new Date()): string {
  const [y, m, d] = PARIS_DAY.format(now).split('-').map(Number);
  const extra = (quotaUsedToday ? 1 : 0) + Math.max(0, position - 1);
  return new Date(Date.UTC(y, m - 1, d + extra)).toISOString().slice(0, 10);
}
