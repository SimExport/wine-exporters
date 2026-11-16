// Manual-entry Supabase Auth codes: emails are sent by Supabase Auth itself (native
// invite / OTP templates must display {{ .Token }}, never {{ .ConfirmationURL }}).
// Pure module (no SDK import) so callers and tests inject the client.

const PROD = "https://wine-exporters.com";
const ALLOWED_ORIGINS = new Set([
  PROD,
  "https://wine-exporters.lovable.app",
  "https://id-preview--2cbf3846-6e77-4cb7-aac8-1f5496e7b841.lovable.app",
]);
const PAGES = { activation: "/set-password", recovery: "/reset-password" } as const;

export const normalizeEmail = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const e = v.trim().toLowerCase();
  return e.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
};

/** Only WineExporters origins (prod, published, preview) are accepted; anything else falls back to prod. */
export function pageUrl(requested: unknown, page: keyof typeof PAGES = "activation"): string {
  let origin = PROD;
  if (typeof requested === "string") {
    try {
      const u = new URL(requested);
      if (ALLOWED_ORIGINS.has(u.origin)) origin = u.origin;
    } catch { /* fallback to prod */ }
  }
  return origin + PAGES[page];
}

/** New account: native invite (creates the user; existing invitation triggers apply). */
export const sendInviteCode = (admin: any, email: string, requested?: unknown) =>
  admin.auth.admin.inviteUserByEmail(email, { redirectTo: pageUrl(requested) });

/** Existing account: native email OTP, never creates an account, never touches roles/plans. */
export const sendExistingAccountCode = (admin: any, email: string, requested?: unknown) =>
  admin.auth.signInWithOtp({ email, options: { emailRedirectTo: pageUrl(requested), shouldCreateUser: false } });
