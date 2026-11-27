// No Supabase credential is ever returned to the OAuth client.
export const SCOPES = ["wineexporters:account", "wineexporters:importers", "wineexporters:crm:read", "wineexporters:crm:write"] as const;
export const TOKEN_TTL = 600;
const opaque = /^[A-Za-z0-9_-]{43}$/;
const verifier = /^[A-Za-z0-9._~-]{43,128}$/;
export class OAuthError extends Error {
  code: string; status: number;
  constructor(code: string, status = 400) { super(code); this.code = code; this.status = status; }
}
export type Store = (op: string, data: Record<string, unknown>) => Promise<any>;
export type Identity = (jwt: string) => Promise<{ user_id: string; session_id: string }>;
export type Config = { issuer: string; resource: string; website: string; enabled: boolean; endpointBase?: string };
export const random = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
export async function hash(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function one(p: URLSearchParams, key: string, required = true, max = 2048) {
  const values = p.getAll(key);
  if (values.length > 1 || (values[0]?.length || 0) > max || (required && !values[0])) throw new OAuthError("invalid_request");
  return values[0] || "";
}
function allowedKeys(p: URLSearchParams, allowed: string[]) {
  for (const key of p.keys()) if (!allowed.includes(key)) throw new OAuthError("invalid_request");
}
async function limitedBody(req: Request) {
  if (Number(req.headers.get("content-length") || 0) > 16384) throw new OAuthError("invalid_request", 413);
  if (!req.body) return "";
  const reader = req.body.getReader(), decoder = new TextDecoder();
  let size = 0, text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 16384) { await reader.cancel(); throw new OAuthError("invalid_request", 413); }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}
const json = (data: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(data), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Pragma": "no-cache", "Referrer-Policy": "no-referrer", ...headers },
});
export function bearer(req: Request) {
  const value = req.headers.get("authorization") || "";
  if (!/^Bearer [^\s]+$/i.test(value)) throw new OAuthError("invalid_token", 401);
  return value.slice(7);
}
export function authorizationMetadata(config: Config){
  const endpoints=config.endpointBase||config.issuer;
  return {issuer:config.issuer,authorization_response_iss_parameter_supported:true,
    authorization_endpoint:endpoints+'/authorize',token_endpoint:endpoints+'/token',revocation_endpoint:endpoints+'/revoke',
    response_types_supported:['code'],grant_types_supported:['authorization_code'],code_challenge_methods_supported:['S256'],
    token_endpoint_auth_methods_supported:['none'],revocation_endpoint_auth_methods_supported:['none'],scopes_supported:SCOPES};
}
export function createBroker(config: Config, store: Store, identity: Identity) {
  const endpoints=config.endpointBase || config.issuer;
  for (const value of [config.issuer, config.resource, config.website, endpoints]) {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password || u.search || u.hash || value.endsWith("/")) throw Error("Invalid broker configuration");
  }
  if (new URL(config.website).origin !== config.website) throw Error("Website must be an origin");
  const base = new URL(config.issuer).pathname.replace(/\/$/, "");
  const cookieName = (id: string) => "__Host-wine_mcp_" + id;
  const cookie = (id: string, value: string, age: number) => `${cookieName(id)}=${value}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${age}`;
  const trustedOrigin = (req: Request) => {
    if (req.headers.get("origin") !== config.website) throw new OAuthError("invalid_request", 403);
  };
  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    // Do not derive issuer, resource or redirect URIs from Host/X-Forwarded-Host.
    const path = url.pathname.slice(base.length);
    const cors: Record<string, string> = req.headers.get("origin") === config.website ? {
      "Access-Control-Allow-Origin": config.website,
      "Access-Control-Allow-Headers": "authorization, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
    } : {};
    try {
      if (!url.pathname.startsWith(base + "/")) throw new OAuthError("invalid_request", 404);
      if (req.method === "GET" && path === "/.well-known/oauth-authorization-server") return json(authorizationMetadata(config));
      if (!config.enabled) return json({ error: "temporarily_unavailable" }, 503);
      if (req.method === "OPTIONS") { trustedOrigin(req); return new Response(null, { status: 204, headers: cors }); }
      if (req.method === "GET" && path === "/authorize") {
        const p = url.searchParams;
        allowedKeys(p, ["response_type", "client_id", "redirect_uri", "resource", "state", "scope", "code_challenge", "code_challenge_method"]);
        if (one(p, "response_type") !== "code" || one(p, "code_challenge_method") !== "S256") throw new OAuthError("invalid_request");
        const challenge = one(p, "code_challenge"), state = one(p, "state");
        if (!opaque.test(challenge) || state.length > 1024) throw new OAuthError("invalid_request");
        if (one(p, "resource") !== config.resource) throw new OAuthError("invalid_target");
        const scopes = one(p, "scope").split(" ");
        if (new Set(scopes).size !== scopes.length || scopes.some(s => !SCOPES.includes(s as any))) throw new OAuthError("invalid_scope");
        const request = random(), binding = random();
        // The DB validates enabled, pre-registered client and exact redirect URI before any redirect.
        const result = await store("pending", { request_hash: await hash(request), binding_hash: await hash(binding),
          client_id: one(p, "client_id"), redirect_uri: one(p, "redirect_uri"), resource: config.resource,
          state, challenge, scopes });
        if (!result?.ok) throw new OAuthError("unauthorized_client");
        return new Response(null, { status: 303, headers: { "Location": config.website + "/mcp/consent#request=" + request,
          "Set-Cookie": cookie(request, binding, 300), "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
      }
      if (req.method !== "POST") throw new OAuthError("invalid_request", 405);
      const raw = await limitedBody(req);
      if (!(req.headers.get("content-type") || "").startsWith("application/x-www-form-urlencoded")) throw new OAuthError("invalid_request", 415);
      const p = new URLSearchParams(raw);
      if (path === "/details" || path === "/decision") {
        trustedOrigin(req);
        allowedKeys(p, path === "/details" ? ["request"] : ["request", "approve", "access_token"]);
        const id = one(p, "request"); if (!opaque.test(id)) throw new OAuthError("invalid_request");
        if (path === "/details") {
          const details = await store("details", { request_hash: await hash(id) });
          if (!details) throw new OAuthError("invalid_request");
          return json(details, 200, cors);
        }
        const binding = (req.headers.get("cookie") || "").split(/;\s*/).find(x => x.startsWith(cookieName(id) + "="))?.split("=")[1] || "";
        if (!opaque.test(binding)) throw new OAuthError("invalid_request", 403);
        const approve = one(p, "approve"); if (!["yes", "no"].includes(approve)) throw new OAuthError("invalid_request");
        const user = approve === "yes" ? await identity(one(p, "access_token", true, 8192)) : null;
        const code = random();
        const result = await store("decision", { request_hash: await hash(id), binding_hash: await hash(binding),
          approve: approve === "yes", user_id: user?.user_id, session_id: user?.session_id, code_hash: await hash(code) });
        if (!result) throw new OAuthError("invalid_request");
        const target = new URL(result.redirect_uri);
        target.searchParams.set("state", result.state);
        target.searchParams.set("iss", config.issuer);
        target.searchParams.set(approve === "yes" ? "code" : "error", approve === "yes" ? code : "access_denied");
        return new Response(null, { status: 303, headers: { "Location": target.href, "Set-Cookie": cookie(id, "", 0),
          "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
      }
      if (path === "/token") {
        allowedKeys(p, ["grant_type", "client_id", "code", "redirect_uri", "resource", "code_verifier"]);
        if (req.headers.has("authorization")) throw new OAuthError("invalid_client", 401);
        if (one(p, "grant_type") !== "authorization_code") throw new OAuthError("unsupported_grant_type");
        const v = one(p, "code_verifier"), code = one(p, "code");
        if (!verifier.test(v) || !opaque.test(code)) throw new OAuthError("invalid_grant");
        if (one(p, "resource") !== config.resource) throw new OAuthError("invalid_target");
        const token = "wemcp_" + random();
        const result = await store("exchange", { code_hash: await hash(code), challenge: await hash(v),
          client_id: one(p, "client_id"), redirect_uri: one(p, "redirect_uri"), resource: config.resource,
          token_hash: await hash(token) });
        if (!result) throw new OAuthError("invalid_grant");
        return json({ access_token: token, token_type: "Bearer", expires_in: TOKEN_TTL, scope: result.scopes.join(" ") });
      }
      if (path === "/revoke") {
        allowedKeys(p, ["token", "client_id", "token_type_hint"]);
        if (req.headers.has("authorization")) throw new OAuthError("invalid_client", 401);
        await store("revoke", { token_hash: await hash(one(p, "token")), client_id: one(p, "client_id") });
        return json({}); // RFC 7009: unknown tokens have the same result.
      }
      if (path === "/connections" || path === "/disconnect") {
        trustedOrigin(req); allowedKeys(p, path === "/connections" ? [] : ["grant_id"]);
        const user = await identity(bearer(req));
        const result = await store(path === "/connections" ? "connections" : "disconnect", {
          ...user, ...(path === "/disconnect" ? { grant_id: one(p, "grant_id") } : {}),
        });
        return json(result, 200, cors);
      }
      throw new OAuthError("invalid_request", 404);
    } catch (e) {
      // Never log request bodies, token values, cookies, SQL errors or credentials.
      return json({ error: e instanceof OAuthError ? e.code : "temporarily_unavailable" }, e instanceof OAuthError ? e.status : 503, cors);
    }
  };
}
