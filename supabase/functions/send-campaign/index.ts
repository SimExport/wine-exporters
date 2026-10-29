// Edge Function: send-campaign (admin only) — sends the SAVED email (message_html) to Brevo.
// No Claude generation, no HTML transformation. Idempotent: DB lock + Brevo id persisted
// before sendNow; uncertain outcomes are never retried automatically (manual check required).
// Modes: send | check | confirm_send | release. Option test=true → BREVO_TEST_LIST_ID only.
// The actual send flow lives in _shared/custom-campaign-send.ts (shared with send-queued-campaign).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { markCampaignLive, sendCustomCampaign } from "../_shared/custom-campaign-send.ts";

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
  const sendCtx = { admin, brevoKey: BREVO, resendKey: Deno.env.get("RESEND_API_KEY"), reviewerId: u.user.id as string, testListId: Deno.env.get("BREVO_TEST_LIST_ID") };

  const { data: c } = await admin.from("campaigns").select("*").eq("id", id).maybeSingle();
  if (!c) return json(404, { error: "Campaign not found" });
  const { data: testFlag } = await admin.rpc("is_test_campaign", { _id: id });
  const isTest = testFlag === true;

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
      if (SENT_STATES.includes(found.status)) { await markCampaignLive(sendCtx, c, found.id, isTest); return json(200, { result: "already_sent", brevoCampaignId: found.id }); }
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
      if (SENT_STATES.includes(found.status)) { await markCampaignLive(sendCtx, c, found.id, isTest); return json(200, { result: "already_sent" }); }
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
      await markCampaignLive(sendCtx, c, found.id, isTest);
      return json(200, { result: "sent", brevoCampaignId: found.id });
    }

    // mode === "send"
    if (c.status !== "pending_validation") return json(409, { error: "Campaign is not pending validation" });
    if (!isCustomEmailCampaign(c)) return json(409, { error: "Not a custom email campaign (legacy path)" });
    const r = await sendCustomCampaign(sendCtx, c, { testRequested, isTest });
    return json(r.status, r.body);
  } catch (e: any) {
    console.error("send-campaign failed:", e?.message ?? e);
    return json(500, { error: e?.message ?? "send-campaign failed" });
  }
});
