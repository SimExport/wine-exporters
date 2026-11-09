import { matchesInternalSecret, resultJson, serviceClient } from '../_shared/campaign-results-auth.ts';
import { ALERT_RECIPIENT, MAX_ALERT_ATTEMPTS, alertEmail, runMonitor, type AlertRow, type Deps } from './monitor.ts';
import type { OpenIncident, Snapshot } from './policy.ts';

const SENDER = 'WineExporters <notifications@exportvins.fr>';
const must = <T>(r: { data: T; error: unknown }) => { if (r.error) throw r.error; return r.data; };

function supabaseDeps(admin: ReturnType<typeof serviceClient>): Deps {
  const col = (kind: 'open' | 'resolved') => kind === 'open'
    ? { state: 'alert_state', attempts: 'alert_attempts', sent: 'alert_sent_at', error: 'alert_error' }
    : { state: 'resolved_alert_state', attempts: 'resolved_alert_attempts', sent: 'resolved_alert_sent_at', error: 'resolved_alert_error' };
  return {
    async openIncidents() {
      return must(await admin.from('system_incidents').select('id,dedupe_key,source,resource_id').eq('status', 'open')) as OpenIncident[];
    },
    async load(open) {
      const since = new Date(Date.now() - 86_400_000).toISOString();
      const jobs = must(await admin.from('campaign_result_jobs').select('campaign_id,stage,status,next_attempt_at,lease_until,updated_at,last_error,attempts'));
      const queue = must(await admin.from('campaign_send_queue').select('campaign_id,state,error,attempted_at'));
      const ids = [...new Set([...jobs.map((j: any) => j.campaign_id), ...queue.map((q: any) => q.campaign_id), ...open.map((o) => o.resource_id).filter(Boolean)])];
      const camps = must(await admin.from('campaigns').select('id,name,status,send_error,user_id').or(`send_error.not.is.null${ids.length ? `,id.in.(${ids.join(',')})` : ''}`));
      const userIds = [...new Set(camps.map((c: any) => c.user_id))];
      const profiles = userIds.length ? must(await admin.from('profiles').select('user_id,domain_name').in('user_id', userIds)) : [];
      const dom = new Map(profiles.map((p: any) => [p.user_id, p.domain_name]));
      const logCols = 'id,campaign_id,event_type,recipient,status,error_message,created_at';
      const openLogIds = open.filter((o) => o.source === 'email').map((o) => o.dedupe_key.slice(6));
      const recent = must(await admin.from('campaign_email_logs').select(logCols).eq('status', 'failed').gte('created_at', since));
      const older = openLogIds.length ? must(await admin.from('campaign_email_logs').select(logCols).in('id', openLogIds)) : [];
      const failedLogs = [...new Map([...recent, ...older].map((l: any) => [l.id, l])).values()];
      const sentLogs = failedLogs.length ? must(await admin.from('campaign_email_logs').select(logCols).eq('status', 'sent').in('event_type', [...new Set(failedLogs.map((l: any) => l.event_type))]).gte('created_at', failedLogs.map((l: any) => l.created_at).sort()[0])) : [];
      return { jobs, queue, campaigns: camps.map((c: any) => ({ id: c.id, name: c.name, status: c.status, send_error: c.send_error, domain: dom.get(c.user_id) ?? null })), failedLogs, sentLogs } as Snapshot;
    },
    async record(d) {
      const rows = must(await admin.rpc('record_system_incident', { _key: d.key, _source: d.source, _category: d.category, _severity: d.severity, _title: d.title, _message: d.message, _technical: d.technical, _resource_type: d.resourceType, _resource_id: d.resourceId, _resource_name: d.resourceName })) as { id: string; inserted: boolean }[];
      return rows[0];
    },
    async resolve(id) {
      const now = new Date().toISOString();
      must(await admin.from('system_incidents').update({ status: 'resolved', resolved_at: now }).eq('id', id).eq('status', 'open'));
      // A resolution email only follows an opening email that was actually sent; unsent openings are dropped.
      must(await admin.from('system_incidents').update({ resolved_alert_state: 'pending' }).eq('id', id).eq('alert_state', 'sent').eq('resolved_alert_state', 'none'));
      must(await admin.from('system_incidents').update({ alert_state: 'none' }).eq('id', id).in('alert_state', ['pending', 'failed']));
    },
    async claimAlerts(kind) {
      const c = col(kind);
      const statusFilter = kind === 'open' ? 'open' : 'resolved';
      const rows = must(await admin.from('system_incidents').select(`id,human_title,human_message,category,resource_name,first_seen_at,resolved_at,${c.attempts}`).eq('status', statusFilter).in(c.state, ['pending', 'failed']).lt(c.attempts, MAX_ALERT_ATTEMPTS).limit(10)) as any[];
      const claimed: AlertRow[] = [];
      for (const r of rows) {
        const got = must(await admin.from('system_incidents').update({ [c.state]: 'sending', [c.attempts]: r[c.attempts] + 1 }).eq('id', r.id).in(c.state, ['pending', 'failed']).eq(c.attempts, r[c.attempts]).select('id'));
        if (got.length) claimed.push(r);
      }
      return claimed;
    },
    async finishAlert(kind, id, result, error) {
      const c = col(kind);
      must(await admin.from('system_incidents').update({ [c.state]: result, [c.error]: error?.slice(0, 300) ?? null, ...(result === 'sent' ? { [c.sent]: new Date().toISOString() } : {}) }).eq('id', id).eq(c.state, 'sending'));
    },
    async sendEmail(kind, row) {
      const key = Deno.env.get('RESEND_API_KEY');
      if (!key) return { result: 'failed', error: 'RESEND_API_KEY missing' };
      const { subject, html } = alertEmail(kind, row);
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST', signal: AbortSignal.timeout(15_000),
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `incident-${row.id}-${kind}` },
          body: JSON.stringify({ from: SENDER, to: [ALERT_RECIPIENT], subject, html }),
        });
        if (res.ok) return { result: 'sent', error: null };
        const body = (await res.text()).slice(0, 200);
        // 4xx = rejected before sending (safe to retry); 5xx = outcome unknown, never resent.
        return { result: res.status < 500 ? 'failed' : 'uncertain', error: `${res.status}: ${body}` };
      } catch (e) {
        return { result: 'uncertain', error: e instanceof Error ? e.message : 'network error' };
      }
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return resultJson(200, {});
  if (req.method !== 'POST') return resultJson(405, { error: 'Method not allowed' });
  if (!matchesInternalSecret(req.headers.get('x-campaign-results-secret'), Deno.env.get('CAMPAIGN_RESULTS_INTERNAL_SECRET'))) return resultJson(401, { error: 'Unauthorized' });
  try {
    return resultJson(200, await runMonitor(supabaseDeps(serviceClient())));
  } catch (e) {
    console.error('monitor failed', e);
    return resultJson(500, { error: e instanceof Error ? e.message : 'Monitor failed' });
  }
});
