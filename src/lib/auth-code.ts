// React-free helpers for the manual-code activation / recovery flow.
// The code only ever lives in component memory: never in the URL, storage or logs.
export type VerifyType = "invite" | "email" | "recovery";
export type CodeErrorKind = "invalid_or_expired" | "rate_limited" | "network" | "unknown";

export const ACTIVATION_TYPES: VerifyType[] = ["invite", "email", "recovery"];
export const RECOVERY_TYPES: VerifyType[] = ["recovery"];
export const RESEND_DELAY_SECONDS = 60;

export const normalizeEmail = (v: string) => v.trim().toLowerCase();
export const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(v)) && v.length <= 255;
/** Keeps digits only (users paste "123 456" or "123-456"). */
export const normalizeCode = (v: string) => v.replace(/\D/g, "").slice(0, 10);
export const isValidCode = (v: string) => /^\d{6,10}$/.test(v);

export function classifyAuthError(err: any): CodeErrorKind {
  if (!err) return "unknown";
  const code = String(err.code ?? ""); const msg = String(err.message ?? "");
  if (err.status === 429 || /rate_limit|over_/.test(code) || /rate limit|too many|seconds/i.test(msg)) return "rate_limited";
  if (code === "otp_expired" || code === "otp_disabled" || /expired|invalid|not found/i.test(msg) || err.status === 403) return "invalid_or_expired";
  if (/fetch|network/i.test(msg) || err.name === "AuthRetryableFetchError") return "network";
  return "unknown";
}

type VerifyClient = { auth: { verifyOtp: (p: any) => Promise<{ data: any; error: any }> } };

/** Tries each native type in order; stops at the first success or at a non "invalid code" error. */
export async function verifyCode(client: VerifyClient, email: string, code: string, types: VerifyType[]) {
  let last: any = null;
  for (const type of types) {
    const { data, error } = await client.auth.verifyOtp({ email: normalizeEmail(email), token: code, type });
    if (!error && data?.session) return { ok: true as const, session: data.session, type };
    last = error ?? { message: "no_session" };
    if (classifyAuthError(last) !== "invalid_or_expired") break;
  }
  return { ok: false as const, kind: classifyAuthError(last) };
}

export type LegacyParams = { pkceCode: string | null; accessToken: string | null; error: string | null };
/** Reads old email-link outputs (?code=, #access_token=, #error=) so they can be handled once and stripped. */
export function readLegacyParams(href: string): LegacyParams {
  const url = new URL(href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  return {
    pkceCode: url.searchParams.get("code"),
    accessToken: hash.get("access_token"),
    error: hash.get("error_code") || hash.get("error") || url.searchParams.get("error_code") || url.searchParams.get("error"),
  };
}
export const hasLegacyParams = (p: LegacyParams) => Boolean(p.pkceCode || p.accessToken || p.error);
