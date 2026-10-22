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
