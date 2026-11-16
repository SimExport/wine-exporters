import { test } from "node:test";
import assert from "node:assert/strict";
import { ACTIVATION_TYPES, RECOVERY_TYPES, classifyAuthError, normalizeCode, normalizeEmail, readLegacyParams, verifyCode } from "./auth-code";

const client = (validType: string, validCode = "123456", opts: { rate?: boolean } = {}) => {
  const calls: any[] = [];
  return { calls, auth: { async verifyOtp(p: any) {
    calls.push(p);
    if (opts.rate) return { data: {}, error: { status: 429, code: "over_request_rate_limit", message: "rate limit" } };
    if (p.type === validType && p.token === validCode) return { data: { session: { access_token: "s" } }, error: null };
    return { data: {}, error: { status: 403, code: "otp_expired", message: "Token has expired or is invalid" } };
  } } };
};

test("correct invitation code establishes a session", async () => {
  const c = client("invite");
  const r = await verifyCode(c, " Jane@Example.COM ", "123456", ACTIVATION_TYPES);
  assert.equal(r.ok, true); assert.equal(c.calls[0].email, "jane@example.com");
});
test("existing account code is accepted as email type", async () => {
  const r = await verifyCode(client("email"), "a@b.co", "123456", ACTIVATION_TYPES);
  assert.equal(r.ok && r.type, "email");
});
test("wrong code is rejected as invalid/expired", async () => {
  const r = await verifyCode(client("invite"), "a@b.co", "000000", ACTIVATION_TYPES);
  assert.deepEqual(r, { ok: false, kind: "invalid_or_expired" });
});
test("expired or already used code (same server answer) is rejected", async () => {
  const r = await verifyCode(client("none"), "a@b.co", "123456", RECOVERY_TYPES);
  assert.deepEqual(r, { ok: false, kind: "invalid_or_expired" });
});
test("recovery page only accepts recovery codes", async () => {
  const c = client("invite");
  const r = await verifyCode(c, "a@b.co", "123456", RECOVERY_TYPES);
  assert.equal(r.ok, false); assert.deepEqual(c.calls.map((x) => x.type), ["recovery"]);
});
test("server rate limit stops retries immediately", async () => {
  const c = client("invite", "123456", { rate: true });
  const r = await verifyCode(c, "a@b.co", "123456", ACTIVATION_TYPES);
  assert.deepEqual(r, { ok: false, kind: "rate_limited" }); assert.equal(c.calls.length, 1);
});
test("codes and emails are normalized", () => {
  assert.equal(normalizeCode("123 456"), "123456"); assert.equal(normalizeCode("12-34-56"), "123456");
  assert.equal(normalizeEmail("  X@Y.FR "), "x@y.fr");
  assert.equal(classifyAuthError({ status: 429, message: "For security purposes, you can only request this after 42 seconds." }), "rate_limited");
});
test("legacy link outputs are detected", () => {
  assert.equal(readLegacyParams("https://wine-exporters.com/set-password#error=access_denied&error_code=otp_expired").error, "otp_expired");
  assert.equal(readLegacyParams("https://wine-exporters.com/set-password?code=abc").pkceCode, "abc");
  assert.equal(readLegacyParams("https://wine-exporters.com/set-password#access_token=t&refresh_token=r").accessToken, "t");
  assert.equal(readLegacyParams("https://wine-exporters.com/set-password").error, null);
});

import { classifyResendError, identityOf, legacyPkceAction, sameIdentity } from "./auth-code";

test("password change refused when another tab switched account", () => {
  const proven = identityOf({ id: "u1", email: "Jane@Example.com" });
  assert.equal(sameIdentity(proven, { id: "u1", email: "jane@example.com" }), true);
  assert.equal(sameIdentity(proven, { id: "u2", email: "jane@example.com" }), false);
  assert.equal(sameIdentity(proven, { id: "u1", email: "other@example.com" }), false);
  assert.equal(sameIdentity(null, { id: "u1", email: "jane@example.com" }), false);
});
test("resend hides only the known no-account answers", () => {
  assert.equal(classifyResendError(null), "sent");
  assert.equal(classifyResendError({ status: 422, code: "otp_disabled", message: "Signups not allowed for otp" }), "sent");
  assert.equal(classifyResendError({ status: 500, code: "unexpected_failure", message: "Error sending recovery email" }), "failed");
  assert.equal(classifyResendError({ status: 429, code: "over_email_send_rate_limit", message: "rate limit" }), "rate_limited");
});
test("network exception during verification is reported, not thrown", async () => {
  const c = { auth: { async verifyOtp() { throw new TypeError("Failed to fetch"); } } };
  assert.deepEqual(await verifyCode(c, "a@b.co", "123456", ACTIVATION_TYPES), { ok: false, kind: "network" });
});
test("legacy PKCE code is never exchanged twice nor proven by an older session", () => {
  assert.equal(legacyPkceAction(false, true), "accept_client_session");
  assert.equal(legacyPkceAction(true, true), "exchange");
  assert.equal(legacyPkceAction(true, false), "exchange");
  assert.equal(legacyPkceAction(false, false), "none");
});
