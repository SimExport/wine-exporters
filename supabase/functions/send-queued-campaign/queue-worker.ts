// Queue drain logic for send-queued-campaign, isolated from the HTTP entrypoint for testing.
import { parisDayBoundsUtc } from "../_shared/paris-day.ts";
import { sendCustomCampaign } from "../_shared/custom-campaign-send.ts";

export interface QueueDeps {
  admin: any;
  brevoKey: string;
  resendKey?: string;
  now: Date;
  fetchFn?: typeof fetch;
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
  const { admin } = deps;
  const iso = () => new Date().toISOString();

  // Slots (10:00/15:00 Europe/Paris), the 2-per-Paris-day quota (manual sends included) and the global lock
  // are authoritative in the database claim; the worker never re-implements or relaxes them.
  const { data: claimed, error: claimErr } = await admin.rpc("claim_campaign_send");
  if (claimErr) throw claimErr;
  const row = Array.isArray(claimed) ? claimed[0] : claimed;
  if (!row) return { status: 200, body: { result: "empty" } };
  const id = row.campaign_id;
  const setQueue = (patch: Record<string, unknown>) =>
    admin.from("campaign_send_queue").update({ ...patch, updated_at: iso() }).eq("campaign_id", id);
  const finish = async (state: string, error: string | null, extra: Record<string, unknown> = {}) => {
    await setQueue({ state, error });
    return { status: 200, body: { result: state, campaignId: id, error, ...extra } };
  };

  const { data: c } = await admin.from("campaigns").select("*").eq("id", id).maybeSingle();
  const { data: testFlag } = await admin.rpc("is_test_campaign", { _id: id });
  const custom = Number(c?.email_content?.version) === 2 && String(c?.message_html ?? "").trim().length > 0;
  if (!c || c.status !== "pending_validation" || !custom || testFlag === true || c.send_started_at || c.brevo_campaign_id) {
    return finish("failed", "not_eligible");
  }

  const r = await sendCustomCampaign(
    { admin, brevoKey: deps.brevoKey, resendKey: deps.resendKey, reviewerId: row.approved_by ?? null, fetchFn: deps.fetchFn },
    c, { testRequested: false, isTest: false },
  );
  if (r.body?.result === "sent") {
    await setQueue({ state: "sent", sent_at: iso(), error: null });
    return { status: 200, body: { result: "sent", campaignId: id, brevoCampaignId: r.body.brevoCampaignId } };
  }
  if (r.status === 504 || r.body?.result === "uncertain") return finish("needs_review", "uncertain");
  return finish("failed", String(r.body?.error ?? "send_failed"));
}
