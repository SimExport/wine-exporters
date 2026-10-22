import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { contentFromClaude, mapMarketsToLists, missingEmailTags, renderEmailHtml } from "./campaign-email.ts";

const id = "11111111-1111-1111-1111-111111111111";
const claude = {
  subject: "{{ contact.COMPANY_NAME }}, a Pomerol at 18€ EXW",
  heading: "Hello", subtitle: "Pomerol", intro: "Intro <strong>bold</strong> <script>x</script>",
  bullets: [{ title: "A", text: "a" }, { title: "B", text: "b" }, { title: "C", text: "c" }],
  closing: "See you, Jean",
};

Deno.test("rendered email contains all mandatory Brevo tags and interest link", () => {
  const c = contentFromClaude(claude, "Château X");
  const html = renderEmailHtml(c, { campaignId: id, domainName: "Château X", address: "Bordeaux" });
  assertEquals(missingEmailTags(html, c.subject, id), []);
  assert(html.includes("<strong>bold</strong>"));
  assert(!html.includes("<script>"));
});

Deno.test("email without image is valid; image needs https", () => {
  const c = contentFromClaude(claude, "X");
  c.blocks.push({ type: "image", url: "javascript:alert(1)" });
  const html = renderEmailHtml(c, { campaignId: id, domainName: "X", address: "" });
  assert(!html.includes("<img"));
});

Deno.test("missing tags are reported", () => {
  assertEquals(missingEmailTags("<p></p>", "Hi", id).length, 4);
});

Deno.test("Claude content must have exactly 3 bullets", () => {
  let threw = false;
  try { contentFromClaude({ ...claude, bullets: [] }, "X"); } catch { threw = true; }
  assert(threw);
});

Deno.test("market mapping keeps existing Brevo lists", () => {
  const r = mapMarketsToLists(["Germany", "USA", "United Kingdom", "Atlantis"]);
  assertEquals(r.listIds, [148, 175, 176]);
  assertEquals(r.unmatched, ["Atlantis"]);
});

// ---------- Lot B ----------
import { contentV2FromClaude, normalizeContentV2, renderEmailHtmlV2, sanitizeRichHtml } from "./campaign-email.ts";
const MP = "https://x.supabase.co/storage/v1/object/public/media/";

Deno.test("v2: protected tags survive even when all user blocks are minimal", () => {
  const c = normalizeContentV2({ version: 2, subject: "Hello", cta_label: "Request samples", blocks: [{ id: "a", type: "text", html: "<p>Hi</p>" }] }, { mediaPrefix: MP });
  const html = renderEmailHtmlV2(c, { campaignId: id, domainName: "X", address: "" });
  assertEquals(missingEmailTags(html, c.subject, id), []);
  assert(html.includes("Request samples"));
  assertEquals(c.subject, "{{ contact.COMPANY_NAME }} Hello");
});

Deno.test("v2: sanitizer keeps bold/links, strips script and javascript links", () => {
  const s = sanitizeRichHtml('<p>A <strong>b</strong> <a href="https://x.fr">l</a> <a href="javascript:alert(1)">j</a><script>x</script><img src=x onerror=1></p>');
  assert(s.includes("<strong>b</strong>"));
  assert(s.includes('<a href="https://x.fr">l</a>'));
  assert(!s.includes("javascript")); assert(!s.includes("<script")); assert(!s.includes("<img"));
});

Deno.test("v2: images must come from media bucket, max 3, no base64", () => {
  const base = { version: 2, subject: "S", cta_label: "", blocks: [{ id: "t", type: "text", html: "<p>t</p>" }] } as any;
  let threw = false;
  try { normalizeContentV2({ ...base, blocks: [...base.blocks, { id: "i", type: "image", url: "data:image/png;base64,AAA" }] }, { mediaPrefix: MP }); } catch { threw = true; }
  assert(threw); threw = false;
  const img = (n: number) => ({ id: "i" + n, type: "image", url: MP + "u/" + n + ".jpg" });
  try { normalizeContentV2({ ...base, blocks: [...base.blocks, img(1), img(2), img(3), img(4)] }, { mediaPrefix: MP }); } catch { threw = true; }
  assert(threw);
  const ok = normalizeContentV2({ ...base, blocks: [...base.blocks, img(1)] }, { mediaPrefix: MP });
  assertEquals(ok.cta_label, "Send me the price list");
});

Deno.test("v2: user cannot inject Brevo tags or empty email", () => {
  const c = normalizeContentV2({ version: 2, subject: "{{ unsubscribe }} Hi", cta_label: "{{x}}", blocks: [{ id: "a", type: "text", html: "<p>ok</p>" }, { id: "b", type: "text", html: "<p> </p>" }] }, { mediaPrefix: MP });
  assertEquals(c.subject, "{{ contact.COMPANY_NAME }} Hi");
  assertEquals(c.blocks.length, 1);
  let threw = false;
  try { normalizeContentV2({ version: 2, subject: "S", blocks: [] }, { mediaPrefix: MP }); } catch { threw = true; }
  assert(threw);
});

Deno.test("v2: Claude JSON converts into free editable blocks", () => {
  const c = contentV2FromClaude(claude, "Château X");
  assert(c.blocks.length >= 7);
  assert(c.subject.startsWith("{{ contact.COMPANY_NAME }}"));
});
