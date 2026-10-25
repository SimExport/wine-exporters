export const exportCap = (credits: number) => Math.max(0, Math.min(500, Math.floor(credits)));
export const exportCount = (credits: number, available: number) => Math.min(exportCap(credits), Math.max(0, available));
export function boundedSelection(ids: Iterable<string>, credits: number): Set<string> {
  return new Set([...new Set(ids)].slice(0, exportCap(credits)));
}
export function updateSelection(current: Iterable<string>, ids: string[], checked: boolean, credits: number) {
  const next = boundedSelection(current, credits);
  for (const id of ids) {
    if (!checked) next.delete(id);
    else if (next.size < exportCap(credits)) next.add(id);
  }
  return next;
}
export const normalizeCountrySearch = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export async function firstResultIds(count: number, load: (offset: number, limit: number) => Promise<string[]>) {
  const ids: string[] = [];
  const target = exportCount(500, count);
  while (ids.length < target) {
    const limit = Math.min(100, target - ids.length);
    const rows = await load(ids.length, limit);
    ids.push(...rows.slice(0, limit));
    if (rows.length < limit) break;
  }
  return ids;
}