// Edge Function: send-queued-campaign — daily FIFO drain of campaign_send_queue.
// Auth: internal secret only (x-campaign-queue-secret, stored in Vault + env). No JWT, no service_role exposure.
// Quota: at most ONE real send per Europe/Paris civil day, counting manual sends (legacy + custom) of the day.
// Test campaigns are never sent here (RPC + eligibility re-check). Uncertain Brevo outcomes block the
// queue entry in needs_review for manual handling — never retried automatically.
import { matchesInternalSecret, resultJson, serviceClient } from "../_shared/campaign-results-auth.ts";
import { runQueueOnce } from "./queue-worker.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return resultJson(200, {});
  if (req.method !== "POST") return resultJson(405, { error: "Method not allowed" });
  let admin: any;
  try { admin = serviceClient(); } catch (e) { return resultJson(500, { error: (e as Error).message }); }
  // The shared secret lives only in the Vault (service_role RPC) — never in env vars or code.
  const { data: expected } = await admin.rpc("get_campaign_queue_secret");
  if (!matchesInternalSecret(req.headers.get("x-campaign-queue-secret"), expected ?? undefined)) {
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
