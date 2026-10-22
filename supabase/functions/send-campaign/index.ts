// Edge Function: send-campaign (admin only) — sends the SAVED email to Brevo.
// No Claude generation. Idempotent: DB lock + Brevo id persisted before sendNow,
// uncertain outcomes are never retried automatically (manual check required).
// Modes: send | check | confirm_send | release
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { buildOwnerEmailHtml, mapMarketsToLists, missingEmailTags } from "../_shared/campaign-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SENT_STATES = ["sent", "inProcess", "queued", "in_process", "archive"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  const BREVO = Deno.env.get("BREVO_API_KEY");
  const RESEND = Deno.env.get("RESEND_API_KEY");
  if (!BREVO) return json(500, { error: "BREVO_API_KEY not configured" });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u } = token ? await admin.auth.getUser(token) : { data: null as any };
  if (!u?.user) return json(401, { error: "Invalid token" });
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
  if (!isAdmin) return json(403, { error: "Forbidden" });

  let body: any;
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }
  const id = String(body?.campaignId ?? "");
  const mode = String(body?.mode ?? "send");
  if (!UUID.test(id) || !["send", "check", "confirm_send", "release"].includes(mode)) return json(400, { error: "Invalid input" });

  const brevo = (path: string, init: RequestInit = {}) => fetch(`https://api.brevo.com/v3${path}`, {
    ...init, signal: AbortSignal.timeout(30_000),
    headers: { "api-key": BREVO, accept: "application/json", "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const setRow = (patch: Record<string, unknown>) => admin.from("campaigns").update(patch).eq("id", id);
  const tag = `[WE-${id}]`;

  const { data: c } = await admin.from("campaigns").select("*").eq("id", id).maybeSingle();
  if (!c) return json(404, { error: "Campaign not found" });

  const markLive = async (brevoId: number) => {
    const now = new Date().toISOString();
    await setRow({ status: "active", brevo_campaign_id: brevoId, validated_at: now, launched_at: now, admin_reviewer: u.user.id, send_error: null });
    if (RESEND) {
      try {
        const { data: au } = await admin.auth.admin.getUserById(c.user_id);
        const markets = (c.target_markets?.length ? c.target_markets : c.markets) ?? [];
        if (au?.user?.email) await fetch("https://api.resend.com/emails", {
          method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${RESEND}` },
          body: JSON.stringify({ from: "WineExporters <simon@exportvins.fr>", to: [au.user.email], cc: ["simon@exportvins.fr"], reply_to: "simon@exportvins.fr",
            subject: `Your campaign is live — ${c.name} / Votre campagne est en ligne`, html: buildOwnerEmailHtml(c.name, markets) }),
        });
      } catch (e) { console.error("Resend notify failed:", e); }
    }
  };

  const findBrevo = async (): Promise<{ id: number; status: string } | null> => {
    if (c.brevo_campaign_id) {
      const r = await brevo(`/emailCampaigns/${c.brevo_campaign_id}`);
      if (r.ok) { const j = await r.json(); return { id: j.id, status: j.status }; }
    }
    const r = await brevo(`/emailCampaigns?limit=100&offset=0&sort=desc`);
    if (!r.ok) throw new Error(`Brevo list ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const hit = ((await r.json())?.campaigns ?? []).find((x: any) => String(x.name ?? "").includes(tag));
    return hit ? { id: hit.id, status: hit.status } : null;
  };

  try {
    if (mode === "check") {
      const found = await findBrevo();
      if (!found) return json(200, { result: "not_found", message: "No Brevo campaign found. Confirm with mode=release only after checking Brevo yourself." });
      if (SENT_STATES.includes(found.status)) { await markLive(found.id); return json(200, { result: "already_sent", brevoCampaignId: found.id }); }
      await setRow({ brevo_campaign_id: found.id, send_error: "brevo_draft" });
      return json(200, { result: "brevo_draft", brevoCampaignId: found.id, status: found.status });
    }

    if (mode === "release") {
      if (c.brevo_campaign_id) return json(409, { error: "A Brevo campaign exists; use check / confirm_send" });
      if (await findBrevo()) return json(409, { error: "A Brevo campaign was found; use check" });
      await setRow({ send_started_at: null, send_error: null });
      return json(200, { result: "released" });
    }

    if (mode === "confirm_send") {
      if (c.status !== "pending_validation" || !c.brevo_campaign_id) return json(409, { error: "Nothing to confirm" });
      const found = await findBrevo();
      if (!found) return json(409, { error: "Brevo campaign not found" });
      if (SENT_STATES.includes(found.status)) { await markLive(found.id); return json(200, { result: "already_sent" }); }
      const s = await brevo(`/emailCampaigns/${found.id}/sendNow`, { method: "POST" });
      if (!s.ok && s.status !== 204) {
        await setRow({ send_error: `send_failed ${s.status}` });
        return json(502, { error: "Brevo sendNow failed", status: s.status, details: (await s.text()).slice(0, 300) });
      }
      await markLive(found.id);
      return json(200, { result: "sent", brevoCampaignId: found.id });
    }

    // mode === "send"
    const html = String(c.message_html ?? ""); const subject = String(c.subject_selected ?? "");
    if (!html.trim()) return json(409, { error: "No saved email for this campaign" });
    const missing = missingEmailTags(html, subject, id);
    if (missing.length) return json(422, { error: "Saved email is missing required elements", missing });
    const { listIds, unmatched } = mapMarketsToLists((c.target_markets?.length ? c.target_markets : c.markets) ?? []);
    if (!listIds.length) return json(422, { error: "No Brevo lists matched target markets", unmatched });

    const { data: locked } = await admin.from("campaigns").update({ send_started_at: new Date().toISOString(), send_error: null })
      .eq("id", id).eq("status", "pending_validation").is("send_started_at", null).is("brevo_campaign_id", null).select("id");
    if (!locked?.length) return json(409, { error: "Campaign already sent or send in progress" });

    let brevoId: number;
    try {
      const r = await brevo("/emailCampaigns", { method: "POST", body: JSON.stringify({
        name: `${c.name} ${tag}`, subject, sender: { name: "WineExporters", email: "simon@exportvins.fr" }, recipients: { listIds }, htmlContent: html,
      }) });
      if (!r.ok) {
        // Definite refusal from Brevo: nothing created, lock released.
        const t = await r.text();
        await setRow({ send_started_at: null, send_error: `brevo_create ${r.status}` });
        return json(502, { error: "Brevo create failed", status: r.status, details: t.slice(0, 300) });
      }
      brevoId = (await r.json())?.id;
      if (!brevoId) throw new Error("no id");
    } catch (e) {
      await setRow({ send_error: "uncertain" });
      console.error("Brevo create uncertain:", e);
      return json(504, { error: "Brevo outcome uncertain — use mode=check, no automatic retry" });
    }
    await setRow({ brevo_campaign_id: brevoId });

    try {
      const s = await brevo(`/emailCampaigns/${brevoId}/sendNow`, { method: "POST" });
      if (!s.ok && s.status !== 204) {
        await setRow({ send_error: `send_failed ${s.status}` });
        return json(502, { error: "Brevo sendNow failed — use mode=check", status: s.status, details: (await s.text()).slice(0, 300) });
      }
    } catch (e) {
      await setRow({ send_error: "uncertain" });
      console.error("Brevo sendNow uncertain:", e);
      return json(504, { error: "Brevo outcome uncertain — use mode=check, no automatic retry" });
    }
    await markLive(brevoId);
    return json(200, { result: "sent", brevoCampaignId: brevoId, listIds, unmatched });
  } catch (e: any) {
    console.error("send-campaign failed:", e?.message ?? e);
    return json(500, { error: e?.message ?? "send-campaign failed" });
  }
});
