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
