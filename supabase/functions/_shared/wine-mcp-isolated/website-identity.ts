import { OAuthError } from "./oauth-core.ts";
export function websiteIdentity(base: string, anon: string, request: typeof fetch = fetch) {
  return async (jwt: string) => {
    // Auth validates the signature, expiry and current user. The private SQL actor()
    // additionally verifies this exact session is still present and unexpired.
    if (jwt.length > 8192 || jwt.split(".").length !== 3) throw new OAuthError("invalid_token", 401);
    const res = await request(base + "/auth/v1/user", { headers: { apikey: anon, Authorization: "Bearer " + jwt }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new OAuthError("invalid_token", 401);
    const user = await res.json();
    let claims;
    try {
      const part = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      claims = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, "=")));
    } catch { throw new OAuthError("invalid_token", 401); }
    if (!user?.id || claims.sub !== user.id || claims.iss !== base + "/auth/v1" || claims.role !== "authenticated"
      || claims.client_id != null || typeof claims.session_id !== "string" || !user.email_confirmed_at || user.is_anonymous
      || typeof claims.exp !== "number" || claims.exp <= Date.now() / 1000) throw new OAuthError("invalid_token", 401);
    return { user_id: user.id, session_id: claims.session_id };
  };
}

