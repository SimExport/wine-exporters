import { authorizeResults, serviceClient, resultJson } from '../_shared/campaign-results-auth.ts';
import { eligibleCampaign, nextResultStage, resultFailureStatus } from '../_shared/campaign-results-policy.ts';

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return resultJson(200, {});
  if (req.method !== 'POST') return resultJson(405, { error: 'Method not allowed' });
  const admin = serviceClient();
  const access = await authorizeResults(req, admin);
  if (!access) return resultJson(401, { error: 'Unauthorized' });
  let id: string | undefined;
  let token: string | undefined;
  let upstreamStatus = 500;
  try {
    const body = await req.json();
    if (body.install_secret === true) {
      if (access !== 'internal') return resultJson(403, { error: 'Internal only' });
      const installed = await admin.rpc('install_campaign_results_secret', { _secret: Deno.env.get('CAMPAIGN_RESULTS_INTERNAL_SECRET') });
      if (installed.error) throw installed.error;
      return resultJson(200, { configured: true });
    }
    if (typeof body.campaign_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.campaign_id)) return resultJson(400, { error: 'Invalid campaign_id' });
    id = body.campaign_id;
    if (body.dry_run === true) return resultJson(200, { dry_run: true, providers_called: false, writes: false });
    const fetched = await admin.from('campaigns').select('id,status,launched_at,brevo_campaign_id').eq('id', id).single();
    if (fetched.error) throw fetched.error;
    const test = await admin.rpc('is_test_campaign', { _id: id });
    if (test.error) throw test.error;
    if (test.data) return resultJson(200, { skipped: true, reason: 'test_campaign' });
    // Only a pre-existing job may finish notification after the results transition.
    const existing = await admin.from('campaign_result_jobs').select('*').eq('campaign_id', id).maybeSingle();
    if (existing.error) throw existing.error;
    if (!eligibleCampaign(fetched.data, false) && !(fetched.data.status === 'results' && existing.data?.stage === 'notify')) return resultJson(200, { skipped: true, reason: 'not_eligible' });
    if (!existing.data) {
      if (access !== 'admin') return resultJson(409, { error: 'Job must be enqueued by daily dispatcher' });
      const insert = await admin.from('campaign_result_jobs').insert({ campaign_id: id });
      if (insert.error) throw insert.error;
    } else if (body.resume === true && access === 'admin') {
      if (existing.data.notification_state !== 'pending' && existing.data.notification_state !== 'sent') return resultJson(409, { error: 'Notification requires reconciliation' });
      const resume = await admin.from('campaign_result_jobs').update({ status: 'pending', hops: 0, lease_until: null, next_attempt_at: new Date().toISOString() }).eq('campaign_id', id).eq('status', 'paused');
      if (resume.error) throw resume.error;
    }
    const claim = await admin.rpc('claim_campaign_result_job', { _id: id });
    if (claim.error) throw claim.error;
    const job = claim.data?.[0];
    if (!job) return resultJson(200, { skipped: true, reason: 'locked_or_paused' });
    token = job.lease_token;
    const secret = Deno.env.get('CAMPAIGN_RESULTS_INTERNAL_SECRET');
    const url = Deno.env.get('SUPABASE_URL');
    if (!secret || !url) throw new Error('Internal configuration missing');
    if (job.stage === 'notify') {
      const blank = await admin.from('campaign_interested_contacts').select('id', { count: 'exact', head: true }).eq('campaign_id', id).or('description.is.null,description.eq.');
      if (blank.error) throw blank.error;
      if (blank.count) throw new Error('Enrichment incomplete before notification');
      if (fetched.data.status === 'active') {
        const transitioned = await admin.from('campaigns').update({ status: 'results' }).eq('id', id).eq('status', 'active').select('id');
        if (transitioned.error || !transitioned.data?.length) throw transitioned.error ?? new Error('Campaign status changed');
      }
    }
    const name = job.stage === 'sync' ? 'sync-brevo-campaign' : job.stage === 'enrich' ? 'enrich-campaign-prospects' : 'notify-campaign-completed';
    const payload = job.stage === 'notify' ? { campaignId: id } : { campaign_id: id, ...(job.stage === 'sync' ? { mode: 'both', defer_enrichment: true } : { force: false, limit: 1 }) };
    const response = await fetch(`${url}/functions/v1/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-campaign-results-secret': secret, 'x-campaign-results-lease': token ?? '' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(110_000) });
    upstreamStatus = response.status;
    const data = await response.json();
    if (!response.ok || data.failed || data.skipped) throw new Error(data.error ?? `Operation failed (${response.status})`);
    const stage = nextResultStage(job.stage, data);
    const saved = await admin.from('campaign_result_jobs').update({ stage, status: stage === 'done' ? 'completed' : 'pending', lease_until: null, lease_token: null, next_attempt_at: new Date(Date.now() + 60_000).toISOString(), last_error: null }).eq('campaign_id', id).eq('lease_token', token);
    if (saved.error) throw saved.error;
    const wake = await admin.rpc('dispatch_campaign_results', { _daily: false });
    if (wake.error) throw wake.error;
    return resultJson(200, { ok: true, stage });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Result processing failed';
    console.error('J+2 processing failed', id, message);
    if (id && token) {
      const saved = await admin.from('campaign_result_jobs').update({ status: resultFailureStatus(upstreamStatus, message), last_error: message.slice(0, 1000), lease_until: null, lease_token: null, next_attempt_at: new Date(Date.now() + (upstreamStatus === 429 ? 24 * 60 * 60_000 : 5 * 60_000)).toISOString() }).eq('campaign_id', id).eq('lease_token', token);
      if (saved.error) console.error('J+2 failure persistence failed', saved.error.message);
    }
    return resultJson(upstreamStatus >= 400 ? upstreamStatus : 500, { error: message });
  }
}
if (import.meta.main) Deno.serve(handler);