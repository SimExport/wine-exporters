// Europe/Paris civil-day helpers (React-free, no dependency).
const PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Paris", hour12: false,
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
});
const DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });

function parisOffsetMs(at: Date): number {
  const p = Object.fromEntries(PARTS.formatToParts(at).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asUtc - at.getTime();
}

function parisMidnightUtc(y: number, m: number, d: number): Date {
  const guess = Date.UTC(y, m - 1, d);
  let start = guess - parisOffsetMs(new Date(guess));
  const off = parisOffsetMs(new Date(start));
  if (start !== guess - off) start = guess - off;
  return new Date(start);
}

/** UTC bounds [start, end) of the Paris civil day containing `now`. */
export function parisDayBoundsUtc(now: Date): { start: Date; end: Date } {
  const [y, m, d] = DAY.format(now).split("-").map(Number);
  return { start: parisMidnightUtc(y, m, d), end: parisMidnightUtc(y, m, d + 1) };
}
