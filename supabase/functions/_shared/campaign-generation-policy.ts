/** One reserved AI generation per campaign email; manual saves are independent. */
export const MAX_EMAIL_GENERATIONS = 1;

export const canGenerateCampaignEmail = (count: number | null | undefined): boolean =>
  (count ?? 0) < MAX_EMAIL_GENERATIONS;

export interface AdminPendingCheck {
  isAdmin: boolean;
  isTest: boolean;
  queueState: string | null; // campaign_send_queue.state, null when absent
}
interface CampaignRow {
  status?: string | null;
  send_started_at?: string | null;
  brevo_campaign_id?: number | string | null;
  email_content?: unknown;
  message_html?: string | null;
}

const hasV2Email = (c: CampaignRow) =>
  Number((c.email_content as any)?.version) === 2 && String(c.message_html ?? "").trim().length > 0;

/**
 * Admin-only edits on a pending_validation campaign (prepare legacy email, manual edit).
 * Returns null when allowed, else an error code. Never applies to producers.
 * - "prepare": only when no v2 email exists yet (never overwrites saved content).
 * - "edit": only when a v2 email already exists.
 */
export function adminPendingEmailBlock(c: CampaignRow, chk: AdminPendingCheck, action: "prepare" | "edit"): string | null {
  if (!chk.isAdmin) return "admin_only";
  if (c.status !== "pending_validation") return "not_pending";
  if (chk.isTest) return "test_campaign";
  if (c.send_started_at || c.brevo_campaign_id) return "send_locked";
  if (chk.queueState && chk.queueState !== "failed") return "already_queued";
  if (action === "prepare" && (hasV2Email(c) || String(c.message_html ?? "").trim())) return "email_exists";
  if (action === "edit" && !hasV2Email(c)) return "no_email";
  return null;
}
