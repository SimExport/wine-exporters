import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

export function resultJson(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
export function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase server configuration missing');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export function matchesInternalSecret(supplied: string | null, expected: string | undefined) {
  if (!supplied || !expected) return false;
  const a = new TextEncoder().encode(supplied), b = new TextEncoder().encode(expected);
  let mismatch = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) mismatch |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return mismatch === 0;
}
export async function authorizeResults(req: Request, admin: ReturnType<typeof serviceClient>) {
  const supplied = req.headers.get('x-campaign-results-secret');
  if (supplied !== null) return matchesInternalSecret(supplied, Deno.env.get('CAMPAIGN_RESULTS_INTERNAL_SECRET')) ? 'internal' : null;
  const header = req.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !key) return null;
  const auth = createClient(url, key, { global: { headers: { Authorization: header } } });
  const { data, error } = await auth.auth.getClaims(header.slice(7));
  if (error || !data?.claims?.sub) return null;
  const role = await admin.rpc('has_role', { _user_id: data.claims.sub, _role: 'admin' });
  return !role.error && role.data === true ? 'admin' : null;
}
export async function internalJob(req: Request, admin: ReturnType<typeof serviceClient>, id: string, stage: string) {
  const { data, error } = await admin.from('campaign_result_jobs').select('*').eq('campaign_id', id).maybeSingle();
  if (error) throw error;
  return data && data.stage === stage && data.status === 'processing' && data.lease_token === req.headers.get('x-campaign-results-lease') && Date.parse(data.lease_until) > Date.now() ? data : null;
}
export async function withResultOperation(req: Request, handler: (req: Request) => Promise<Response>) {
  if (req.method === 'OPTIONS') return resultJson(200, {});
  let admin: ReturnType<typeof serviceClient> | undefined;
  let token: string | undefined;
  let id: string | undefined;
  try {
    if (req.method !== 'POST') return resultJson(405, { error: 'Method not allowed' });
    admin = serviceClient();
    if (!await authorizeResults(req, admin)) return resultJson(401, { error: 'Unauthorized' });
    const body = await req.clone().json();
    id = body.campaign_id ?? body.campaignId;
    if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return resultJson(400, { error: 'Invalid campaign id' });
    const claim = await admin.rpc('claim_campaign_result_operation', { _id: id });
    if (claim.error) throw claim.error;
    if (!claim.data) return resultJson(409, { error: 'Campaign operation already running' });
    token = claim.data;
    return await handler(req);
  } catch (error) {
    return resultJson(500, { error: error instanceof Error ? error.message : 'Operation failed' });
  } finally {
    if (admin && id && token) {
      const released = await admin.rpc('release_campaign_result_operation', { _id: id, _token: token });
      if (released.error) console.error('Result operation release failed', released.error.message);
    }
  }
}