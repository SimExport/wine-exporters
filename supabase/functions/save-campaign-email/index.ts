// Edge Function: save-campaign-email
// Single source of truth for the campaign email HTML: the browser sends the
// editable v2 content only; the server validates, sanitizes and renders it.
// mode "preview" renders without writing; mode "save" also persists it.
// Never contacts Brevo, never consumes a campaign credit.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { adminPendingEmailBlock } from "../_shared/campaign-generation-policy.ts";
import { missingEmailTags, normalizeContentV2, renderEmailHtmlV2 } from "../_shared/campaign-email.ts";

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

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "Missing token" });
  const { data: u, error: uErr } = await admin.auth.getUser(token);
  if (uErr || !u?.user) return json(401, { error: "Invalid token" });
  const callerId = u.user.id;

  let body: any;
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }
  const campaignId = String(body?.campaignId ?? "");
  const mode = body?.mode === "save" ? "save" : "preview";
  if (!UUID.test(campaignId)) return json(400, { error: "campaignId must be a UUID" });
  if (JSON.stringify(body?.content ?? null).length > 100_000) return json(413, { error: "Email content too large" });

  const { data: campaign } = await admin.from("campaigns").select("id,user_id,status,name,send_started_at,brevo_campaign_id,email_content,message_html").eq("id", campaignId).maybeSingle();
  if (!campaign) return json(404, { error: "Campaign not found" });
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: callerId, _role: "admin" });
  if (campaign.user_id !== callerId && !isAdmin) return json(403, { error: "Forbidden" });
  const { data: allowed } = await admin.rpc("has_campaign_editor_access", { _user_id: callerId });
  if (!allowed) return json(403, { error: "Email editor not enabled for this account" });
  // Admin-only manual edit of a prepared pending campaign (no AI, no credit, never while queued/locked).
  const adminEdit = campaign.status === "pending_validation";
  if (adminEdit) {
    const [{ data: q }, { data: ev }] = await Promise.all([
      admin.from("campaign_send_queue").select("state").eq("campaign_id", campaignId).maybeSingle(),
      admin.from("campaign_events").select("id").eq("campaign_id", campaignId).eq("type", "test_campaign").limit(1),
    ]);
    const block = adminPendingEmailBlock(campaign, { isAdmin: !!isAdmin, isTest: !!ev?.length, queueState: q?.state ?? null }, "edit");
    if (block) return json(block === "admin_only" ? 403 : 409, { error: `Edit refused: ${block}` });
  } else if (campaign.status !== "draft") return json(409, { error: "Only draft campaigns can be edited" });

  let content;
  try { content = normalizeContentV2(body?.content); } catch (e: any) { return json(422, { error: e?.message ?? "Invalid content" }); }

  const { data: profile } = await admin.from("profiles").select("domain_name,location").eq("user_id", campaign.user_id).maybeSingle();
  const domainName = profile?.domain_name || campaign.name;
  const html = renderEmailHtmlV2(content, { campaignId, domainName, address: profile?.location ?? "" });
  const missing = missingEmailTags(html, content.subject, campaignId);
  if (missing.length) return json(422, { error: "Email is missing required elements", missing });

  if (mode === "save") {
    const { data: saved, error } = await admin.from("campaigns")
      .update({ email_content: content, message_html: html, subject_selected: content.subject })
      .eq("id", campaignId).eq("status", adminEdit ? "pending_validation" : "draft")
      .is("send_started_at", null).is("brevo_campaign_id", null).select("id");
    if (error) return json(500, { error: error.message });
    if (!saved?.length) return json(409, { error: "Campaign is no longer a draft" });
  }
  return json(200, { content, html, subject: content.subject, saved: mode === "save" });
});
