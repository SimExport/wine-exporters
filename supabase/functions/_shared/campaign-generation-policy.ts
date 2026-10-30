/** One reserved AI generation per campaign email; manual saves are independent. */
export const MAX_EMAIL_GENERATIONS = 1;

/** A reserved generation that produced no saved email after this delay is considered interrupted. */
export const STALE_GENERATION_MS = 3 * 60_000;

export interface GenerationState { hasEmail?: boolean; generatedAt?: string | null; now?: number }

/** "interrupted": the slot was used but no email was saved (page left, timeout) and can be retried. */
export function generationState(count: number | null | undefined, st: GenerationState = {}): "available" | "in_progress" | "interrupted" | "used" {
  if ((count ?? 0) < MAX_EMAIL_GENERATIONS) return "available";
  if (st.hasEmail || st.hasEmail === undefined) return "used";
  const at = st.generatedAt ? new Date(st.generatedAt).getTime() : NaN;
  if (Number.isFinite(at) && (st.now ?? Date.now()) - at < STALE_GENERATION_MS) return "in_progress";
  return "interrupted";
}

export const canGenerateCampaignEmail = (count: number | null | undefined, st?: GenerationState): boolean => {
  const g = generationState(count, st);
  return g === "available" || g === "interrupted";
};

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
