// Edge Function: send-campaign (admin only) — sends the SAVED email (message_html) to Brevo.
// No Claude generation, no HTML transformation. Idempotent: DB lock + Brevo id persisted
// before sendNow; uncertain outcomes are never retried automatically (manual check required).
// Modes: send | check | confirm_send | release. Option test=true → BREVO_TEST_LIST_ID only.
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
export const SENT_STATES = ["sent", "inProcess", "queued", "in_process", "archive"];

/** New editor path: v2 content + saved HTML. Required only for mode=send. */
export const isCustomEmailCampaign = (c: any) =>
  Number(c?.email_content?.version) === 2 && String(c?.message_html ?? "").trim().length > 0;

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
  const testRequested = body?.test === true;
  if (!UUID.test(id) || !["send", "check", "confirm_send", "release"].includes(mode)) return json(400, { error: "Invalid input" });

  const brevo = (path: string, init: RequestInit = {}) => fetch(`https://api.brevo.com/v3${path}`, {
    ...init, signal: AbortSignal.timeout(30_000),
    headers: { "api-key": BREVO, accept: "application/json", "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const setRow = (patch: Record<string, unknown>) => admin.from("campaigns").update(patch).eq("id", id);
  const tag = `[WE-${id}]`;
  const event = (type: string, payload: Record<string, unknown>) =>
    admin.from("campaign_events").insert({ campaign_id: id, type, payload: { ...payload, by: u.user.id } });

  const { data: c } = await admin.from("campaigns").select("*").eq("id", id).maybeSingle();
  if (!c) return json(404, { error: "Campaign not found" });
  const { data: isTest } = await admin.rpc("is_test_campaign", { _id: id });

  /** Marks the campaign live ONCE (conditional transition) and notifies only if the row really changed. */
  const markLive = async (brevoId: number) => {
    const now = new Date().toISOString();
    const finalStatus = isTest ? "archived" : "active";
    const { data: changed } = await admin.from("campaigns")
      .update({ status: finalStatus, brevo_campaign_id: brevoId, validated_at: now, launched_at: now, admin_reviewer: u.user.id, send_error: null })
      .eq("id", id).eq("status", "pending_validation").select("id");
    if (!changed?.length) return false;
    await event("sent", { brevo_campaign_id: brevoId, test: !!isTest });
    if (isTest || !RESEND) return true;
    // Notification failure is logged only: it never affects the Brevo send.
    try {
      const { data: au } = await admin.auth.admin.getUserById(c.user_id);
      const markets = (c.target_markets?.length ? c.target_markets : c.markets) ?? [];
      if (au?.user?.email) {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${RESEND}` },
          body: JSON.stringify({ from: "WineExporters <simon@exportvins.fr>", to: [au.user.email], cc: ["simon@exportvins.fr"], reply_to: "simon@exportvins.fr",
            subject: `Your campaign is live — ${c.name} / Votre campagne est en ligne`, html: buildOwnerEmailHtml(c.name, markets) }),
        });
        if (!r.ok) console.error("Resend notify failed:", r.status, (await r.text()).slice(0, 200));
      }
    } catch (e) { console.error("Resend notify failed:", e); }
    return true;
  };

  const findBrevo = async (): Promise<{ id: number; status: string } | null> => {
    const knownId = c.brevo_campaign_id;
    if (knownId) {
      const r = await brevo(`/emailCampaigns/${knownId}`);
      if (r.ok) { const j = await r.json(); return { id: j.id, status: j.status }; }
      if (r.status !== 404) throw new Error(`Brevo get ${r.status}: ${(await r.text()).slice(0, 300)}`);
    }
    for (let offset = 0; offset < 300; offset += 100) {
      const r = await brevo(`/emailCampaigns?limit=100&offset=${offset}&sort=desc`);
      if (!r.ok) throw new Error(`Brevo list ${r.status}: ${(await r.text()).slice(0, 300)}`);
      const list = (await r.json())?.campaigns ?? [];
      const hit = list.find((x: any) => String(x.name ?? "").includes(tag));
      if (hit) return { id: hit.id, status: hit.status };
      if (list.length < 100) break;
    }
    return null;
  };

  try {
    // Recovery modes work for any pending campaign with a lock or a Brevo id, whatever its path.
    if (mode === "check") {
      if (c.status !== "pending_validation") return json(200, { result: "not_pending", status: c.status });
      const found = await findBrevo();
      if (!found) return json(200, { result: "not_found" });
      if (SENT_STATES.includes(found.status)) { await markLive(found.id); return json(200, { result: "already_sent", brevoCampaignId: found.id }); }
      await setRow({ brevo_campaign_id: found.id, send_error: "brevo_draft" });
      return json(200, { result: "brevo_draft", brevoCampaignId: found.id, status: found.status });
    }

    if (mode === "release") {
      if (body?.confirm !== true) return json(400, { error: "Explicit confirmation required" });
      if (c.status !== "pending_validation") return json(409, { error: "Campaign is not pending" });
      if (c.brevo_campaign_id) return json(409, { error: "A Brevo campaign exists; use check / confirm_send" });
      if (await findBrevo()) return json(409, { error: "A Brevo campaign was found; use check" });
      await setRow({ send_started_at: null, send_error: null });
      await event("send_released", {});
      return json(200, { result: "released" });
    }

    if (mode === "confirm_send") {
      if (body?.confirm !== true) return json(400, { error: "Explicit confirmation required" });
      if (c.status !== "pending_validation" || !c.brevo_campaign_id) return json(409, { error: "Nothing to confirm" });
      const found = await findBrevo();
      if (!found) return json(409, { error: "Brevo campaign not found" });
      if (SENT_STATES.includes(found.status)) { await markLive(found.id); return json(200, { result: "already_sent" }); }
      try {
        const s = await brevo(`/emailCampaigns/${found.id}/sendNow`, { method: "POST" });
        if (!s.ok && s.status !== 204) {
          await setRow({ send_error: `send_failed ${s.status}` });
          return json(502, { error: "Brevo sendNow failed", status: s.status, details: (await s.text()).slice(0, 300) });
        }
      } catch (e) {
        await setRow({ send_error: "uncertain" });
        console.error("Brevo confirm_send uncertain:", e);
        return json(504, { error: "Brevo outcome uncertain — use check, no automatic retry" });
      }
      await markLive(found.id);
      return json(200, { result: "sent", brevoCampaignId: found.id });
    }

    // mode === "send"
    if (c.status !== "pending_validation") return json(409, { error: "Campaign is not pending validation" });
    if (!isCustomEmailCampaign(c)) return json(409, { error: "Not a custom email campaign (legacy path)" });
    const html = String(c.message_html); const subject = String(c.subject_selected ?? "");
    const missing = missingEmailTags(html, subject, id);
    if (missing.length) return json(422, { error: "Saved email is missing required elements", missing });

    let listIds: number[]; let unmatched: string[] = [];
    if (testRequested) {
      const raw = (Deno.env.get("BREVO_TEST_LIST_ID") ?? "").trim();
      if (!/^\d+$/.test(raw)) return json(422, { error: "BREVO_TEST_LIST_ID missing or invalid: test send refused" });
      const lr = await brevo(`/contacts/lists/${raw}`);
      if (!lr.ok) return json(422, { error: "Brevo test list not found: test send refused", status: lr.status });
      listIds = [Number(raw)];
    } else {
      if (isTest) return json(409, { error: "Test campaign: use the test send only" });
      ({ listIds, unmatched } = mapMarketsToLists((c.target_markets?.length ? c.target_markets : c.markets) ?? []));
      if (!listIds.length) return json(422, { error: "No Brevo lists matched target markets", unmatched });
    }

    const { data: locked } = await admin.from("campaigns").update({ send_started_at: new Date().toISOString(), send_error: null })
      .eq("id", id).eq("status", "pending_validation").is("send_started_at", null).is("brevo_campaign_id", null).select("id");
    if (!locked?.length) return json(409, { error: "Campaign already sent or send in progress" });
    if (testRequested && !isTest) {
      // Marks the campaign as a test BEFORE Brevo: sync, enrichment and notifications ignore it.
      await event("test_campaign", {});
    }
    const testMode = testRequested || !!isTest;
    const isTestNow = testMode;

    let brevoId: number;
    try {
      const r = await brevo("/emailCampaigns", { method: "POST", body: JSON.stringify({
        name: `${isTestNow ? "[TEST] " : ""}${c.name} ${tag}`, subject, sender: { name: "WineExporters", email: "simon@exportvins.fr" }, recipients: { listIds }, htmlContent: html,
      }) });
      if (!r.ok) {
        // Definite refusal from Brevo (4xx/5xx with body): nothing created, lock released.
        const t = await r.text();
        await setRow({ send_started_at: null, send_error: `brevo_create ${r.status}` });
        return json(502, { error: "Brevo create failed", status: r.status, details: t.slice(0, 300) });
      }
      brevoId = (await r.json())?.id;
      if (!brevoId) throw new Error("no id");
    } catch (e) {
      await setRow({ send_error: "uncertain" });
      console.error("Brevo create uncertain:", e);
      return json(504, { error: "Brevo outcome uncertain — use check, no automatic retry", result: "uncertain" });
    }
    await setRow({ brevo_campaign_id: brevoId });

    try {
      const s = await brevo(`/emailCampaigns/${brevoId}/sendNow`, { method: "POST" });
      if (!s.ok && s.status !== 204) {
        await setRow({ send_error: `send_failed ${s.status}` });
        return json(502, { error: "Brevo sendNow failed — use check", status: s.status, details: (await s.text()).slice(0, 300) });
      }
    } catch (e) {
      await setRow({ send_error: "uncertain" });
      console.error("Brevo sendNow uncertain:", e);
      return json(504, { error: "Brevo outcome uncertain — use check, no automatic retry", result: "uncertain" });
    }
    // markLive reads isTest from the start of the request; refresh for a just-marked test campaign.
    if (testRequested && !isTest) {
      const now = new Date().toISOString();
      await admin.from("campaigns").update({ status: "archived", validated_at: now, launched_at: now, admin_reviewer: u.user.id, send_error: null })
        .eq("id", id).eq("status", "pending_validation");
      await event("sent", { brevo_campaign_id: brevoId, test: true });
    } else {
      await markLive(brevoId);
    }
    return json(200, { result: "sent", brevoCampaignId: brevoId, listIds, unmatched, test: isTestNow });
  } catch (e: any) {
    console.error("send-campaign failed:", e?.message ?? e);
    return json(500, { error: e?.message ?? "send-campaign failed" });
  }
});
