import { detect, isResolved, type Detected, type OpenIncident, type Snapshot } from './policy.ts';

export const ALERT_RECIPIENT = 'simon@exportvins.fr';
export const MAX_ALERT_ATTEMPTS = 3;
export interface AlertRow { id: string; human_title: string; human_message: string; category: string; resource_name: string | null; first_seen_at: string; resolved_at: string | null }
export type SendResult = 'sent' | 'failed' | 'uncertain';
export interface Deps {
  load(openIncidents: OpenIncident[]): Promise<Snapshot>;
  openIncidents(): Promise<OpenIncident[]>;
  record(d: Detected): Promise<{ id: string; inserted: boolean }>;
  resolve(id: string): Promise<void>;
  /** Conditionally moves pending/failed (attempts < max) to sending; returns claimed rows. */
  claimAlerts(kind: 'open' | 'resolved'): Promise<AlertRow[]>;
  finishAlert(kind: 'open' | 'resolved', id: string, result: SendResult, error: string | null): Promise<void>;
  sendEmail(kind: 'open' | 'resolved', row: AlertRow): Promise<{ result: SendResult; error: string | null }>;
}

export async function runMonitor(deps: Deps, now = Date.now()) {
  const before = await deps.openIncidents();
  const snapshot = await deps.load(before);
  const found = detect(snapshot, now);
  let created = 0;
  for (const d of found) if ((await deps.record(d)).inserted) created++;
  const foundKeys = new Set(found.map((d) => d.key));
  let resolved = 0;
  for (const inc of await deps.openIncidents()) {
    if (foundKeys.has(inc.dedupe_key)) continue;
    if (isResolved(inc, snapshot)) { await deps.resolve(inc.id); resolved++; }
  }
  // Alerts never block detection: errors are stored and retried a bounded number of times.
  let emails = 0;
  for (const kind of ['open', 'resolved'] as const) {
    for (const row of await deps.claimAlerts(kind)) {
      let out: { result: SendResult; error: string | null };
      try { out = await deps.sendEmail(kind, row); } catch (e) { out = { result: 'uncertain', error: e instanceof Error ? e.message : 'unknown' }; }
      await deps.finishAlert(kind, row.id, out.result, out.error);
      if (out.result === 'sent') emails++;
    }
  }
  return { detected: found.length, created, resolved, emails };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const paris = (iso: string) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso));

/** Email body: human text only — no technical messages, prospect data or keys. */
export function alertEmail(kind: 'open' | 'resolved', r: AlertRow) {
  const subject = kind === 'open' ? `[WineExporters] Blocage : ${r.human_title}` : `[WineExporters] Résolu : ${r.human_title}`;
  const lines = kind === 'open'
    ? [r.human_message, `Détecté le ${paris(r.first_seen_at)} (heure de Paris).`]
    : [`L'incident est résolu${r.resolved_at ? ` depuis le ${paris(r.resolved_at)} (heure de Paris)` : ''}.`];
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px"><h2 style="color:#59191F">${esc(r.human_title)}</h2><p style="color:#666">${esc(r.category)}</p>${lines.map((l) => `<p>${esc(l)}</p>`).join('')}<p><a href="https://wine-exporters.com/admin/system-health" style="color:#59191F">Ouvrir Santé du système</a></p></div>`;
  return { subject, html };
}
