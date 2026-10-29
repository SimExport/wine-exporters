// Shared "mode=send" logic for custom (v2) campaigns: used by send-campaign (admin JWT)
// and send-queued-campaign (internal secret, daily cron). No Claude, no HTML transformation.
// Idempotent: DB lock + Brevo id persisted before sendNow; uncertain outcomes are never
// retried automatically (manual check required). markCampaignLive notifies only on confirmed send.
import { buildOwnerEmailHtml, mapMarketsToLists, missingEmailTags } from "./campaign-email.ts";

export interface SendContext {
  admin: any; // service_role Supabase client
  brevoKey: string;
  resendKey?: string;
  reviewerId: string | null; // recorded in campaign_events and admin_reviewer
  testListId?: string; // raw BREVO_TEST_LIST_ID
  fetchFn?: typeof fetch; // injectable for tests
}

export interface SendOutcome { status: number; body: Record<string, unknown> }

/** Marks the campaign live ONCE (conditional transition) and notifies only if the row really changed. */
export async function markCampaignLive(ctx: SendContext, campaign: any, brevoId: number, isTest: boolean): Promise<boolean> {
  const { admin } = ctx;
  const now = new Date().toISOString();
  const finalStatus = isTest ? "archived" : "active";
  const { data: changed } = await admin.from("campaigns")
    .update({ status: finalStatus, brevo_campaign_id: brevoId, validated_at: now, launched_at: now, admin_reviewer: ctx.reviewerId, send_error: null })
    .eq("id", campaign.id).eq("status", "pending_validation").select("id");
  if (!changed?.length) return false;
  await admin.from("campaign_events").insert({ campaign_id: campaign.id, type: "sent", payload: { brevo_campaign_id: brevoId, test: !!isTest, by: ctx.reviewerId } });
  if (isTest || !ctx.resendKey) return true;
  // Notification failure is logged only: it never affects the Brevo send.
  try {
    const { data: au } = await admin.auth.admin.getUserById(campaign.user_id);
    const markets = (campaign.target_markets?.length ? campaign.target_markets : campaign.markets) ?? [];
    if (au?.user?.email) {
      const r = await (ctx.fetchFn ?? fetch)("https://api.resend.com/emails", {
        method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${ctx.resendKey}` },
        body: JSON.stringify({ from: "WineExporters <simon@exportvins.fr>", to: [au.user.email], cc: ["simon@exportvins.fr"], reply_to: "simon@exportvins.fr",
          subject: `Your campaign is live — ${campaign.name} / Votre campagne est en ligne`, html: buildOwnerEmailHtml(campaign.name, markets) }),
      });
      if (!r.ok) console.error("Resend notify failed:", r.status, (await r.text()).slice(0, 200));
    }
  } catch (e) { console.error("Resend notify failed:", e); }
  return true;
}

/** Sends the SAVED email (message_html) to Brevo. Caller must have verified eligibility (pending, custom, not test unless testRequested). */
export async function sendCustomCampaign(ctx: SendContext, campaign: any, opts: { testRequested: boolean; isTest: boolean }): Promise<SendOutcome> {
  const { admin } = ctx;
  const fetchFn = ctx.fetchFn ?? fetch;
  const brevo = (path: string, init: RequestInit = {}) => fetchFn(`https://api.brevo.com/v3${path}`, {
    ...init, signal: AbortSignal.timeout(30_000),
    headers: { "api-key": ctx.brevoKey, accept: "application/json", "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const setRow = (patch: Record<string, unknown>) => admin.from("campaigns").update(patch).eq("id", campaign.id);
  const tag = `[WE-${campaign.id}]`;
  const c = campaign;
  let isTest = opts.isTest;

  const html = String(c.message_html); const subject = String(c.subject_selected ?? "");
  const missing = missingEmailTags(html, subject, c.id);
  if (missing.length) return { status: 422, body: { error: "Saved email is missing required elements", missing } };

  let listIds: number[]; let unmatched: string[] = [];
  if (opts.testRequested) {
    const raw = (ctx.testListId ?? "").trim();
    if (!/^\d+$/.test(raw)) return { status: 422, body: { error: "BREVO_TEST_LIST_ID missing or invalid: test send refused" } };
    const lr = await brevo(`/contacts/lists/${raw}`);
    if (!lr.ok) return { status: 422, body: { error: "Brevo test list not found: test send refused", status: lr.status } };
    listIds = [Number(raw)];
  } else {
    if (isTest) return { status: 409, body: { error: "Test campaign: use the test send only" } };
    ({ listIds, unmatched } = mapMarketsToLists((c.target_markets?.length ? c.target_markets : c.markets) ?? []));
    if (!listIds.length) return { status: 422, body: { error: "No Brevo lists matched target markets", unmatched } };
  }

  const { data: locked } = await admin.from("campaigns").update({ send_started_at: new Date().toISOString(), send_error: null })
    .eq("id", c.id).eq("status", "pending_validation").is("send_started_at", null).is("brevo_campaign_id", null).select("id");
  if (!locked?.length) return { status: 409, body: { error: "Campaign already sent or send in progress" } };
  if (opts.testRequested && !isTest) {
    // Marks the campaign as a test BEFORE Brevo: sync, enrichment and notifications ignore it.
    await admin.from("campaign_events").insert({ campaign_id: c.id, type: "test_campaign", payload: { by: ctx.reviewerId } });
    isTest = true;
  }
  const isTestNow = isTest;

  let brevoId: number;
  try {
    const r = await brevo("/emailCampaigns", { method: "POST", body: JSON.stringify({
      name: `${isTestNow ? "[TEST] " : ""}${c.name} ${tag}`, subject, sender: { name: "WineExporters", email: "simon@exportvins.fr" }, recipients: { listIds }, htmlContent: html,
    }) });
    if (!r.ok) {
      // Definite refusal from Brevo (4xx/5xx with body): nothing created, lock released.
      const t = await r.text();
      await setRow({ send_started_at: null, send_error: `brevo_create ${r.status}` });
      return { status: 502, body: { error: "Brevo create failed", status: r.status, details: t.slice(0, 300) } };
    }
    brevoId = (await r.json())?.id;
    if (!brevoId) throw new Error("no id");
  } catch (e) {
    await setRow({ send_error: "uncertain" });
    console.error("Brevo create uncertain:", e);
    return { status: 504, body: { error: "Brevo outcome uncertain — use check, no automatic retry", result: "uncertain" } };
  }
  await setRow({ brevo_campaign_id: brevoId });

  try {
    const s = await brevo(`/emailCampaigns/${brevoId}/sendNow`, { method: "POST" });
    if (!s.ok && s.status !== 204) {
      await setRow({ send_error: `send_failed ${s.status}` });
      return { status: 502, body: { error: "Brevo sendNow failed — use check", status: s.status, details: (await s.text()).slice(0, 300) } };
    }
  } catch (e) {
    await setRow({ send_error: "uncertain" });
    console.error("Brevo sendNow uncertain:", e);
    return { status: 504, body: { error: "Brevo outcome uncertain — use check, no automatic retry", result: "uncertain" } };
  }
  await markCampaignLive(ctx, c, brevoId, isTestNow);
  return { status: 200, body: { result: "sent", brevoCampaignId: brevoId, listIds, unmatched, test: isTestNow } };
}
