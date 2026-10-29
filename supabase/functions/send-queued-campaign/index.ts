// Edge Function: send-queued-campaign — daily FIFO drain of campaign_send_queue.
// Auth: internal secret only (x-campaign-queue-secret, stored in Vault + env). No JWT, no service_role exposure.
// Quota: at most ONE real send per Europe/Paris civil day, counting manual sends (legacy + custom) of the day.
// Test campaigns are never sent here (RPC + eligibility re-check). Uncertain Brevo outcomes block the
// queue entry in needs_review for manual handling — never retried automatically.
import { matchesInternalSecret, resultJson, serviceClient } from "../_shared/campaign-results-auth.ts";
import { parisDayBoundsUtc } from "../_shared/paris-day.ts";
import { sendCustomCampaign } from "../_shared/custom-campaign-send.ts";

export interface QueueDeps {
  admin: any;
  brevoKey: string;
  resendKey?: string;
  now: Date;
}

/** Real (non-test) campaigns that went live today in Europe/Paris. Test sends end archived, never counted. */
export async function countRealSendsToday(admin: any, now: Date): Promise<number> {
  const { start, end } = parisDayBoundsUtc(now);
  const { count, error } = await admin.from("campaigns").select("id", { count: "exact", head: true })
    .in("status", ["active", "sending", "results"])
    .gte("launched_at", start.toISOString()).lt("launched_at", end.toISOString());
  if (error) throw error;
  return count ?? 0;
}

export async function runQueueOnce(deps: QueueDeps): Promise<{ status: number; body: Record<string, unknown> }> {
  const { admin, now } = deps;
  const iso = () => new Date().toISOString();

  if (await countRealSendsToday(admin, now) >= 1) return { status: 200, body: { result: "quota_reached" } };

  const { data: claimed, error: claimErr } = await admin.rpc("claim_campaign_send");
  if (claimErr) throw claimErr;
  const row = Array.isArray(claimed) ? claimed[0] : claimed;
  if (!row) return { status: 200, body: { result: "empty" } };
  const id = row.campaign_id;
  const setQueue = (patch: Record<string, unknown>) =>
    admin.from("campaign_send_queue").update({ ...patch, updated_at: iso() }).eq("campaign_id", id);
  const end = async (state: string, error: string | null, extra: Record<string, unknown> = {}) => {
    await setQueue({ state, error });
    return { status: 200, body: { result: state, campaignId: id, error, ...extra } };
  };

  // Re-evaluate the quota just before sending: a manual send may have landed meanwhile.
  if (await countRealSendsToday(admin, now) >= 1) {
    await admin.from("campaign_send_queue").update({ state: "queued", attempted_at: null, updated_at: iso() }).eq("campaign_id", id).eq("state", "sending");
    return { status: 200, body: { result: "quota_reached" } };
  }

  const { data: c } = await admin.from("campaigns").select("*").eq("id", id).maybeSingle();
  const { data: testFlag } = await admin.rpc("is_test_campaign", { _id: id });
  const custom = Number(c?.email_content?.version) === 2 && String(c?.message_html ?? "").trim().length > 0;
  if (!c || c.status !== "pending_validation" || !custom || testFlag === true || c.send_started_at || c.brevo_campaign_id) {
    return end("failed", "not_eligible");
  }

  const r = await sendCustomCampaign(
    { admin, brevoKey: deps.brevoKey, resendKey: deps.resendKey, reviewerId: row.approved_by ?? null, fetchFn: deps.fetchFn },
    c, { testRequested: false, isTest: false },
  );
  if (r.body?.result === "sent") {
    await setQueue({ state: "sent", sent_at: iso(), error: null });
    return { status: 200, body: { result: "sent", campaignId: id, brevoCampaignId: r.body.brevoCampaignId } };
  }
  if (r.status === 504 || r.body?.result === "uncertain") return end("needs_review", "uncertain");
  return end("failed", String(r.body?.error ?? "send_failed"));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return resultJson(200, {});
  if (req.method !== "POST") return resultJson(405, { error: "Method not allowed" });
  let admin: any;
  try { admin = serviceClient(); } catch (e) { return resultJson(500, { error: (e as Error).message }); }
  if (!matchesInternalSecret(req.headers.get("x-campaign-queue-secret"), Deno.env.get("CAMPAIGN_QUEUE_INTERNAL_SECRET"))) {
    return resultJson(401, { error: "Unauthorized" });
  }
  const brevoKey = Deno.env.get("BREVO_API_KEY");
  if (!brevoKey) return resultJson(500, { error: "BREVO_API_KEY not configured" });
  try {
    const r = await runQueueOnce({ admin, brevoKey, resendKey: Deno.env.get("RESEND_API_KEY"), now: new Date() });
    return resultJson(r.status, r.body);
  } catch (e) {
    console.error("send-queued-campaign failed:", e);
    return resultJson(500, { error: e instanceof Error ? e.message : "send-queued-campaign failed" });
  }
});
