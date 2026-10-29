import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildLaunchEmail, buildScheduledEmail, estimateQueueDay, langOf, sendOnce } from "./campaign-notify.ts";

Deno.test("estimate: before 08:00 UTC, first in queue, quota free -> today", () => {
  assertEquals(estimateQueueDay(1, false, new Date("2026-10-29T07:00:00Z")), "2026-10-29");
});
Deno.test("estimate: before 08:00 UTC but quota used today -> tomorrow", () => {
  assertEquals(estimateQueueDay(1, true, new Date("2026-10-29T07:00:00Z")), "2026-10-30");
});
Deno.test("estimate: after cron, third in queue -> +3 days", () => {
  assertEquals(estimateQueueDay(3, true, new Date("2026-10-29T12:53:00Z")), "2026-11-01");
});
Deno.test("estimate: 23:30 UTC (Paris next day) -> that Paris day's cron; quota counts", () => {
  assertEquals(estimateQueueDay(1, false, new Date("2026-10-29T23:30:00Z")), "2026-10-30");
  assertEquals(estimateQueueDay(1, true, new Date("2026-10-29T23:30:00Z")), "2026-10-31");
});
Deno.test("language: ui_language en -> EN, anything else -> FR", () => {
  assertEquals(langOf("en"), "en"); assertEquals(langOf("fr"), "fr"); assertEquals(langOf(null), "fr");
});
Deno.test("scheduled email FR/EN: monolingual, date, 48–72h, brand, link", () => {
  const fr = buildScheduledEmail("fr", "Test <b>", "2026-10-30", "abc");
  assert(fr.subject.includes("validée et programmée"));
  assert(fr.html.includes("vendredi 30 octobre 2026") && fr.html.includes("48 à 72 h") && fr.html.includes("#59191F"));
  assert(fr.html.includes("https://wine-exporters.com/campaigns/abc") && fr.html.includes("Test &lt;b&gt;"));
  assert(!fr.html.includes("Results") && !fr.html.includes("7 à 10"));
  const en = buildScheduledEmail("en", "X", "2026-10-30", "abc");
  assert(en.subject.includes("approved and scheduled") && en.html.includes("Friday 30 October 2026") && en.html.includes("48–72 hours"));
  assert(!en.html.includes("Votre"));
});
Deno.test("launch email: effective Paris time, monolingual", () => {
  const fr = buildLaunchEmail("fr", "C", "2026-10-30T08:00:12Z", "id", ["Germany"]);
  assert(fr.html.includes("30 octobre 2026") && fr.html.includes("09:00") && fr.html.includes("heure de Paris") && !fr.subject.includes("/"));
  const en = buildLaunchEmail("en", "C", "2026-07-01T08:00:00Z", "id", []);
  assert(en.html.includes("10:00") && en.html.includes("Paris time") && !en.html.includes("Marchés"));
});

function logsMock() {
  const rows: any[] = [];
  const admin = {
    rows,
    from: () => {
      const f: any = { filters: {} as any };
      f.select = () => f; f.eq = (k: string, v: any) => { f.filters[k] = v; return f; };
      f.in = (_k: string, vals: any[]) => { f.inVals = vals; return f; };
      f.limit = () => Promise.resolve({ data: rows.filter((r) => r.campaign_id === f.filters.campaign_id && r.event_type === f.filters.event_type && f.inVals.includes(r.status)) });
      f.insert = (row: any) => ({ select: () => ({ maybeSingle: () => {
        if (rows.some((r) => r.campaign_id === row.campaign_id && r.event_type === row.event_type && r.status !== "failed")) return Promise.resolve({ data: null, error: { code: "23505" } });
        const r = { ...row, id: String(rows.length) }; rows.push(r); return Promise.resolve({ data: r, error: null });
      } }) });
      f.update = (patch: any) => ({ eq: (_k: string, id: string) => { Object.assign(rows.find((r) => r.id === id), patch); return Promise.resolve({}); } });
      return f;
    },
  };
  return admin;
}
const email = { subject: "s", html: "h" };
Deno.test("sendOnce: repeated validation sends once", async () => {
  const admin = logsMock(); let calls = 0;
  const fetchFn = (() => { calls++; return Promise.resolve(new Response('{"id":"r1"}', { status: 200 })); }) as any;
  const o = { campaignId: "c", eventType: "campaign_scheduled", to: "a@b.c", email };
  assertEquals(await sendOnce(admin, "k", fetchFn, o), "sent");
  assertEquals(await sendOnce(admin, "k", fetchFn, o), "skipped");
  assertEquals(calls, 1); assertEquals(admin.rows[0].status, "sent"); assertEquals(admin.rows[0].resend_id, "r1");
});
Deno.test("sendOnce: definite failure is logged and can be retried later", async () => {
  const admin = logsMock();
  const o = { campaignId: "c", eventType: "campaign_launched", to: "a@b.c", email };
  assertEquals(await sendOnce(admin, "k", (() => Promise.resolve(new Response("bad", { status: 422 }))) as any, o), "failed");
  assertEquals(admin.rows[0].status, "failed");
  assertEquals(await sendOnce(admin, "k", (() => Promise.resolve(new Response("{}", { status: 200 }))) as any, o), "sent");
});
Deno.test("sendOnce: network uncertainty keeps the claim (no blind resend)", async () => {
  const admin = logsMock(); let calls = 0;
  const boom = (() => { calls++; return Promise.reject(new Error("timeout")); }) as any;
  const o = { campaignId: "c", eventType: "campaign_launched", to: "a@b.c", email };
  assertEquals(await sendOnce(admin, "k", boom, o), "failed");
  assertEquals(await sendOnce(admin, "k", boom, o), "skipped");
  assertEquals(calls, 1);
});
