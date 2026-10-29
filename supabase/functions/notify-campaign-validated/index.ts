// Edge Function: notify-campaign-validated (admin JWT only).
// kind "scheduled": one FR/EN email when an admin has just queued the campaign (queue.state = queued),
//   with the FIFO estimated send date (Europe/Paris). Deduplicated in campaign_email_logs.
// default (legacy immediate send via create-campaign): unchanged trigger, monolingual, deduplicated.
// A mail failure never cancels scheduling: it is logged only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { buildScheduledEmail, buildLaunchEmail, estimateQueueDay, langOf, sendOnce } from "../_shared/campaign-notify.ts";
import { countRealSendsToday } from "../send-queued-campaign/queue-worker.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return json(500, { error: "RESEND_API_KEY not configured" });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "Missing token" });
  const { data: u } = await admin.auth.getUser(token);
  if (!u?.user) return json(401, { error: "Invalid token" });
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
  if (!isAdmin) return json(403, { error: "Admin only" });

  let body: any;
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }
  const campaignId = String(body?.campaignId ?? "");
  if (!UUID.test(campaignId)) return json(400, { error: "campaignId must be a UUID" });
  const scheduled = body?.kind === "scheduled";

  const { data: campaign } = await admin.from("campaigns").select("id,user_id,name,status,launched_at,target_markets,markets").eq("id", campaignId).maybeSingle();
  if (!campaign) return json(404, { error: "Campaign not found" });
  const { data: au } = await admin.auth.admin.getUserById(campaign.user_id);
  const to = au?.user?.email;
  if (!to) return json(422, { error: "User email not found" });
  const { data: st } = await admin.from("user_settings").select("ui_language").eq("user_id", campaign.user_id).maybeSingle();
  const lang = langOf(st?.ui_language);

  if (scheduled) {
    const { data: q } = await admin.from("campaign_send_queue").select("state").eq("campaign_id", campaignId).maybeSingle();
    if (q?.state !== "queued" || campaign.status !== "pending_validation") return json(409, { error: "Campaign is not scheduled" });
    const { data: queued } = await admin.from("campaign_send_queue").select("campaign_id").eq("state", "queued").order("approved_at", { ascending: true });
    const position = Math.max(0, (queued ?? []).findIndex((x: any) => x.campaign_id === campaignId)) + 1;
    const now = new Date();
    const day = estimateQueueDay(position, (await countRealSendsToday(admin, now)) > 0, now);
    const r = await sendOnce(admin, resendKey, fetch, { campaignId, eventType: "campaign_scheduled", to, bcc: "simon@exportvins.fr", email: buildScheduledEmail(lang, campaign.name, day, campaignId) });
    return json(200, { result: r, estimatedDay: day });
  }

  // Legacy path (create-campaign has just sent): confirmed launch only.
  if (!["active", "sending", "results"].includes(campaign.status) || !campaign.launched_at) return json(409, { error: "Campaign is not launched" });
  const markets = (campaign.target_markets?.length ? campaign.target_markets : campaign.markets) ?? [];
  const r = await sendOnce(admin, resendKey, fetch, { campaignId, eventType: "campaign_launched", to, bcc: "simon@exportvins.fr", email: buildLaunchEmail(lang, campaign.name, campaign.launched_at, campaignId, markets) });
  return json(200, { result: r });
});
