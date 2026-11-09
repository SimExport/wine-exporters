// Pure detection/resolution rules for the system health monitor. No I/O.
export type Severity = 'warning' | 'blocking';
export interface Detected {
  key: string; source: string; category: string; severity: Severity;
  title: string; message: string; technical: string | null;
  resourceType: 'campaign' | null; resourceId: string | null; resourceName: string | null;
}
export interface Job { campaign_id: string; stage: string; status: string; next_attempt_at: string | null; lease_until: string | null; updated_at: string; last_error: string | null; attempts: number }
export interface QueueRow { campaign_id: string; state: string; error: string | null; attempted_at: string | null }
export interface CampaignRow { id: string; name: string; status: string; send_error: string | null; domain: string | null }
export interface EmailLog { id: string; campaign_id: string | null; event_type: string; recipient: string; status: string; error_message: string | null; created_at: string }
export interface Snapshot { jobs: Job[]; queue: QueueRow[]; campaigns: CampaignRow[]; failedLogs: EmailLog[]; sentLogs: EmailLog[] }
export interface OpenIncident { id: string; dedupe_key: string; source: string; resource_id: string | null }

const MIN = 60_000;
const STAGE_FR: Record<string, string> = { sync: 'récupération des statistiques Brevo', enrich: 'analyse des prospects', notify: 'envoi du récapitulatif au producteur', done: 'terminé' };

/** Removes emails, bearer/API tokens and long secrets; caps length. */
export function sanitize(text: string | null | undefined): string | null {
  if (!text) return null;
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/(bearer|api[_-]?key|token|secret|password)\s*[:=]?\s*\S+/gi, '$1 [masqué]')
    .replace(/\b(sk|re|xkeysib|eyJ)[A-Za-z0-9_\-.]{12,}/g, '[masqué]')
    .slice(0, 300);
}

function label(c: CampaignRow | undefined, id: string) {
  const who = c?.domain || 'Producteur inconnu';
  return { who, name: c?.name ?? id.slice(0, 8), resourceName: c?.name ?? null };
}

export function detect(s: Snapshot, now: number): Detected[] {
  const byId = new Map(s.campaigns.map((c) => [c.id, c]));
  const out: Detected[] = [];
  const base = (id: string) => ({ resourceType: 'campaign' as const, resourceId: id, resourceName: byId.get(id)?.name ?? null });

  for (const j of s.jobs) {
    const { who, name } = label(byId.get(j.campaign_id), j.campaign_id);
    const step = STAGE_FR[j.stage] ?? j.stage;
    const tech = sanitize(`stage=${j.stage} status=${j.status} attempts=${j.attempts}${j.last_error ? ` error=${j.last_error}` : ''}`);
    const r = { source: 'campaign_results', category: 'Résultats de campagne', technical: tech, ...base(j.campaign_id) };
    if (j.status === 'paused') {
      out.push({ ...r, key: `results:${j.campaign_id}:paused`, severity: 'blocking', title: `${who} — résultats de campagne bloqués`, message: `Les résultats de « ${name} » sont à l'arrêt (étape : ${step}). Une vérification manuelle est nécessaire.` });
    } else if (j.status === 'retry' && now - Date.parse(j.updated_at) > 30 * MIN) {
      out.push({ ...r, key: `results:${j.campaign_id}:retry`, severity: 'warning', title: `${who} — résultats en nouvelle tentative`, message: `Les résultats de « ${name} » sont relancés automatiquement depuis plus de 30 minutes (étape : ${step}).` });
    } else if (j.status === 'processing' && j.lease_until && now - Date.parse(j.lease_until) > 15 * MIN) {
      out.push({ ...r, key: `results:${j.campaign_id}:stalled`, severity: 'blocking', title: `${who} — traitement des résultats interrompu`, message: `Le traitement de « ${name} » s'est arrêté sans se terminer (étape : ${step}).` });
    } else if (j.status === 'pending' && j.next_attempt_at && now - Date.parse(j.next_attempt_at) > 60 * MIN) {
      out.push({ ...r, key: `results:${j.campaign_id}:queue_stuck`, severity: 'blocking', title: `${who} — file des résultats à l'arrêt`, message: `Les résultats de « ${name} » attendent depuis plus d'une heure sans être traités.` });
    }
  }

  for (const q of s.queue) {
    const { who, name } = label(byId.get(q.campaign_id), q.campaign_id);
    const r = { source: 'campaign_send', category: 'Envoi de campagne', technical: sanitize(`state=${q.state}${q.error ? ` error=${q.error}` : ''}`), ...base(q.campaign_id) };
    if (q.state === 'needs_review') out.push({ ...r, key: `send:${q.campaign_id}:needs_review`, severity: 'blocking', title: `${who} — envoi à vérifier`, message: `L'envoi de « ${name} » a un résultat incertain chez Brevo. Vérifier dans Brevo avant toute nouvelle action.` });
    else if (q.state === 'failed') out.push({ ...r, key: `send:${q.campaign_id}:failed`, severity: 'blocking', title: `${who} — envoi planifié échoué`, message: `L'envoi planifié de « ${name} » a échoué.` });
    else if (q.state === 'sending' && q.attempted_at && now - Date.parse(q.attempted_at) > 30 * MIN) out.push({ ...r, key: `send:${q.campaign_id}:stalled`, severity: 'blocking', title: `${who} — envoi interrompu`, message: `L'envoi de « ${name} » a commencé il y a plus de 30 minutes sans se terminer.` });
  }

  for (const c of s.campaigns) {
    if (c.status !== 'failed' || !c.send_error) continue;
    const { who } = label(c, c.id);
    out.push({ key: `campaign:${c.id}:send_error`, source: 'campaign_send', category: 'Envoi de campagne', severity: 'blocking', title: `${who} — campagne en échec`, message: `La campagne « ${c.name} » est en échec d'envoi.`, technical: sanitize(c.send_error), ...base(c.id) });
  }

  for (const l of s.failedLogs) {
    // Email failures are warnings; the recipient address is never copied.
    out.push({ key: `email:${l.id}`, source: 'email', category: 'Emails automatiques', severity: 'warning', title: `Email non envoyé (${l.event_type})`, message: `Un email automatique n'a pas pu être envoyé.`, technical: sanitize(l.error_message), resourceType: l.campaign_id ? 'campaign' : null, resourceId: l.campaign_id, resourceName: l.campaign_id ? byId.get(l.campaign_id)?.name ?? null : null });
  }
  return out;
}

/** True only when the underlying workflow is really finished — never because a filter stopped matching. */
export function isResolved(inc: OpenIncident, s: Snapshot): boolean {
  const id = inc.resource_id;
  if (inc.source === 'campaign_results') {
    const j = s.jobs.find((x) => x.campaign_id === id);
    return !!j && j.stage === 'done' && j.status === 'completed';
  }
  if (inc.source === 'campaign_send') {
    const q = s.queue.find((x) => x.campaign_id === id);
    const c = s.campaigns.find((x) => x.id === id);
    if (inc.dedupe_key.endsWith(':send_error')) return !!c && !c.send_error && (c.status === 'active' || c.status === 'results');
    return q?.state === 'sent' || (!!c && (c.status === 'active' || c.status === 'results') && !c.send_error);
  }
  if (inc.source === 'email') {
    const failed = s.failedLogs.find((l) => `email:${l.id}` === inc.dedupe_key);
    if (!failed) return false;
    return s.sentLogs.some((l) => l.event_type === failed.event_type && l.recipient === failed.recipient && l.campaign_id === failed.campaign_id && l.created_at > failed.created_at);
  }
  return false;
}
