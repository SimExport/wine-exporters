import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { normalizeEmail, pageUrl, sendExistingAccountCode, sendInviteCode } from "./auth-code.ts";

Deno.test("redirects are allowlisted to WineExporters pages", () => {
  assertEquals(pageUrl("https://evil.example/set-password"), "https://wine-exporters.com/set-password");
  assertEquals(pageUrl("https://wine-exporters.com.evil.example/x"), "https://wine-exporters.com/set-password");
  assertEquals(pageUrl("javascript:alert(1)"), "https://wine-exporters.com/set-password");
  assertEquals(pageUrl("https://wine-exporters.lovable.app/anything?x=1"), "https://wine-exporters.lovable.app/set-password");
  assertEquals(pageUrl("https://id-preview--2cbf3846-6e77-4cb7-aac8-1f5496e7b841.lovable.app/a", "recovery"),
    "https://id-preview--2cbf3846-6e77-4cb7-aac8-1f5496e7b841.lovable.app/reset-password");
  assertEquals(pageUrl(undefined), "https://wine-exporters.com/set-password");
});
Deno.test("emails are normalized", () => {
  assertEquals(normalizeEmail("  Foo@Bar.COM "), "foo@bar.com");
  assertEquals(normalizeEmail("nope"), null);
  assertEquals(normalizeEmail(42), null);
});
Deno.test("existing-account code never creates a user", async () => {
  let opts: any = null;
  const admin = { auth: { signInWithOtp: async (a: any) => { opts = a; return { error: null }; } } };
  await sendExistingAccountCode(admin, "a@b.co", "https://evil.example");
  assertEquals(opts.options.shouldCreateUser, false);
  assertEquals(opts.options.emailRedirectTo, "https://wine-exporters.com/set-password");
});
Deno.test("invite uses the allowlisted page", async () => {
  let to = "";
  const admin = { auth: { admin: { inviteUserByEmail: async (_e: string, o: any) => { to = o.redirectTo; return { error: null }; } } } };
  await sendInviteCode(admin, "a@b.co", "https://attacker.test");
  assertEquals(to, "https://wine-exporters.com/set-password");
});
