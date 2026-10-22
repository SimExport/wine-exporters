// Edge Function: notify-campaign-rejected (admin only)
// Emails the producer once per rejection (latest `rejected` event), FR + EN.
// Idempotent: a `rejection_notified` event records the rejection already notified.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { APP_URL, esc, layout, sendResend } from "../_shared/we-email.ts";

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
  const { data: u } = token ? await admin.auth.getUser(token) : { data: null as any };
  if (!u?.user) return json(401, { error: "Invalid token" });
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
  if (!isAdmin) return json(403, { error: "Forbidden" });

  let body: any;
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }
  const id = String(body?.campaignId ?? "");
  if (!UUID.test(id)) return json(400, { error: "campaignId must be a UUID" });

  const { data: c } = await admin.from("campaigns").select("id,name,user_id,status").eq("id", id).maybeSingle();
  if (!c) return json(404, { error: "Campaign not found" });
  if (c.status !== "draft") return json(409, { error: "Campaign is not back in draft" });
  const { data: ev } = await admin.from("campaign_events").select("id,payload,created_at")
    .eq("campaign_id", id).eq("type", "rejected").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!ev) return json(404, { error: "No rejection found" });
  const { data: done } = await admin.from("campaign_events").select("id")
    .eq("campaign_id", id).eq("type", "rejection_notified").contains("payload", { rejection_id: ev.id }).limit(1);
  if (done?.length) return json(200, { result: "already_notified" });

  const { data: au } = await admin.auth.admin.getUserById(c.user_id);
  const to = au?.user?.email;
  if (!to) return json(404, { error: "Producer email not found" });
  const reason = esc(String((ev.payload as any)?.reason ?? ""));
  const name = esc(c.name);
  const html = layout({
    title: "Votre campagne est à ajuster / Your campaign needs changes",
    paragraphs: [
      `Notre équipe a relu votre campagne <strong>${name}</strong> et vous propose quelques ajustements avant l’envoi.`,
      `<em>${reason}</em>`,
      `Votre email, vos marchés et vos vins sont conservés, et votre crédit aussi : la nouvelle soumission est gratuite.`,
      `—`,
      `Our team reviewed your campaign <strong>${name}</strong> and suggests a few changes before sending. Your email, markets and wines are kept, and so is your credit: resubmitting is free.`,
    ],
    ctaLabel: "Reprendre ma campagne / Edit my campaign",
    ctaUrl: `${APP_URL}/create-campaign?id=${c.id}`,
    footer: "WineExporters by ExportVins — wine-exporters.com",
  });
  try {
    await sendResend(to, `Campagne à ajuster — ${c.name} / Campaign needs changes`, html);
  } catch (e: any) {
    console.error("notify-campaign-rejected failed:", e?.message ?? e);
    return json(502, { error: "Notification failed" });
  }
  await admin.from("campaign_events").insert({ campaign_id: id, type: "rejection_notified", payload: { rejection_id: ev.id } });
  return json(200, { result: "notified" });
});
