import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { countRealSendsToday, runQueueOnce } from "./queue-worker.ts";

// ---------- Mock Supabase admin client ----------
interface State {
  campaigns: any[];
  queue: any[];
  campaign_events: any[];
  testCampaigns: Set<string>;
  updates: { table: string; patch: any }[];
  userEmails: Record<string, string>;
}

class MockQuery {
  filters: { col: string; op: string; val: any }[] = [];
  op: "select" | "update" | "insert" | null = null;
  patch: any; payload: any; opts: any; singleMode: "maybe" | null = null;
  constructor(public state: State, public table: "campaigns" | "queue" | "campaign_events") {}
  select(_cols?: any, opts?: any) { if (this.op !== "update") this.op = "select"; this.opts = opts; return this; }
  insert(p: any) { this.op = "insert"; this.payload = p; return this; }
  update(p: any) { this.op = "update"; this.patch = p; return this; }
  eq(c: string, v: any) { this.filters.push({ col: c, op: "eq", val: v }); return this; }
  is(c: string, v: any) { this.filters.push({ col: c, op: "is", val: v }); return this; }
  in(c: string, vs: any[]) { this.filters.push({ col: c, op: "in", val: vs }); return this; }
  gte(c: string, v: any) { this.filters.push({ col: c, op: "gte", val: v }); return this; }
  lt(c: string, v: any) { this.filters.push({ col: c, op: "lt", val: v }); return this; }
  maybeSingle() { this.singleMode = "maybe"; return this.exec(); }
  then(onF: any, onR: any) { return this.exec().then(onF, onR); }
  private match(row: any) {
    return this.filters.every((f) => {
      const v = row[f.col];
      if (f.op === "eq") return v === f.val;
      if (f.op === "is") return f.val === null ? v == null : v === f.val;
      if (f.op === "in") return f.val.includes(v);
      if (f.op === "gte") return v >= f.val;
      if (f.op === "lt") return v < f.val;
      return true;
    });
  }
  private exec(): Promise<any> {
    const rows: any[] = (this.state as any)[this.table];
    if (this.op === "insert") { const arr = Array.isArray(this.payload) ? this.payload : [this.payload]; rows.push(...arr); return Promise.resolve({ data: arr, error: null }); }
    if (this.op === "update") {
      const hit = rows.filter((r) => this.match(r));
      hit.forEach((r) => Object.assign(r, this.patch));
      this.state.updates.push({ table: this.table, patch: this.patch });
      return Promise.resolve({ data: hit, error: null });
    }
    const hit = rows.filter((r) => this.match(r));
    if (this.opts?.head && this.opts?.count === "exact") return Promise.resolve({ count: hit.length, error: null });
    if (this.singleMode === "maybe") return Promise.resolve({ data: hit[0] ?? null, error: null });
    return Promise.resolve({ data: hit, error: null });
  }
}

function mockAdmin(state: State) {
  return {
    from: (t: string) => new MockQuery(state, t === "campaign_send_queue" ? "queue" : (t as any)),
    rpc: async (name: string, args?: any) => {
      if (name === "claim_campaign_send") {
        const q = state.queue.filter((r) => r.state === "queued")
          .sort((a, b) => a.approved_at === b.approved_at ? (a.campaign_id < b.campaign_id ? -1 : 1) : (a.approved_at < b.approved_at ? -1 : 1));
        const row = q[0];
        if (!row) return { data: [], error: null };
        row.state = "sending"; row.attempted_at = new Date().toISOString();
        return { data: [{ ...row }], error: null };
      }
      if (name === "is_test_campaign") return { data: state.testCampaigns.has(args._id), error: null };
      return { data: null, error: null };
    },
    auth: { admin: { getUserById: async (id: string) => ({ data: { user: state.userEmails[id] ? { email: state.userEmails[id] } : null } }) } },
  };
}

// ---------- Mock fetch (Brevo + Resend) ----------
interface FetchBehavior { createStatus?: number; createThrows?: boolean; sendStatus?: number; sendThrows?: boolean }
function mockFetch(b: FetchBehavior = {}) {
  const calls: { url: string; method: string }[] = [];
  const fn = (async (url: any, init?: RequestInit) => {
    const u = String(url); const method = init?.method ?? "GET";
    calls.push({ url: u, method });
    if (u.includes("resend.com")) return new Response("{}", { status: 200 });
    if (u.endsWith("/emailCampaigns") && method === "POST") {
      if (b.createThrows) throw new Error("network down");
      const st = b.createStatus ?? 201;
      if (st >= 400) return new Response("bad request", { status: st });
      return new Response(JSON.stringify({ id: 555 }), { status: 201 });
    }
    if (u.includes("/sendNow")) {
      if (b.sendThrows) throw new Error("timeout");
      const st = b.sendStatus ?? 204;
      return new Response(st === 204 ? null : "send failed", { status: st });
    }
    return new Response("{}", { status: 200 });
  }) as any;
  return { fn, calls };
}

// ---------- Fixtures ----------
const CID = "11111111-1111-1111-1111-111111111111";
const CID2 = "22222222-2222-2222-2222-222222222222";
const NOW = new Date("2026-10-29T07:00:00Z"); // Paris (CET, UTC+1): day = 2026-10-28T23:00Z → 2026-10-29T23:00Z
const TODAY_PARIS = "2026-10-29T06:00:00Z";
const YESTERDAY_PARIS = "2026-10-28T22:30:00Z";

const customCampaign = (id = CID, over: Record<string, any> = {}) => ({
  id, user_id: "u1", name: "Camp", status: "pending_validation",
  email_content: { version: 2 }, subject_selected: "{{ contact.COMPANY_NAME }} — vins",
  message_html: `<p>{{ unsubscribe }} {{ mirror }} https://wine-exporters.com/interest/${id}</p>`,
  target_markets: ["France"], send_started_at: null, brevo_campaign_id: null, ...over,
});
const queuedRow = (cid = CID, over: Record<string, any> = {}) => ({
  campaign_id: cid, approved_at: "2026-10-28T09:00:00Z", approved_by: "admin1",
  state: "queued", attempted_at: null, sent_at: null, error: null, ...over,
});
const baseState = (over: Partial<State> = {}): State => ({
  campaigns: [], queue: [], campaign_events: [], testCampaigns: new Set(), updates: [],
  userEmails: { u1: "owner@example.com" }, ...over,
});
const deps = (state: State, fetch = mockFetch()) => ({
  admin: mockAdmin(state), brevoKey: "brevo", resendKey: "resend", now: NOW, fetchFn: fetch.fn,
});

Deno.test("empty queue → no claim result, no Brevo call", async () => {
  const s = baseState(); const f = mockFetch();
  const r = await runQueueOnce(deps(s, f));
  assertEquals(r.body.result, "empty");
  assertEquals(f.calls.length, 0);
});

Deno.test("quota: a manual send already live today (Paris) blocks the queue", async () => {
  const s = baseState({ campaigns: [customCampaign(CID2, { status: "active", launched_at: TODAY_PARIS })], queue: [queuedRow()] });
  const f = mockFetch();
  const r = await runQueueOnce(deps(s, f));
  assertEquals(r.body.result, "quota_reached");
  assertEquals(s.queue[0].state, "queued");
  assertEquals(f.calls.length, 0);
});

Deno.test("quota: yesterday 22:30 UTC (still yesterday in Paris) does NOT count", async () => {
  const s = baseState({ campaigns: [customCampaign(CID2, { status: "active", launched_at: YESTERDAY_PARIS }), customCampaign()], queue: [queuedRow()] });
  const r = await runQueueOnce(deps(s));
  assertEquals(r.body.result, "sent");
});

Deno.test("countRealSendsToday excludes archived test sends", async () => {
  const s = baseState({ campaigns: [customCampaign(CID2, { status: "archived", launched_at: TODAY_PARIS })] });
  assertEquals(await countRealSendsToday(mockAdmin(s), NOW), 0);
});

Deno.test("FIFO: the oldest approved campaign is sent, the newer one stays queued", async () => {
  const s = baseState({
    campaigns: [customCampaign(), customCampaign(CID2)],
    queue: [queuedRow(CID2, { approved_at: "2026-10-28T10:00:00Z" }), queuedRow(CID, { approved_at: "2026-10-28T09:00:00Z" })],
  });
  const r = await runQueueOnce(deps(s));
  assertEquals(r.body.result, "sent");
  assertEquals(r.body.campaignId, CID);
  assertEquals(s.queue.find((q) => q.campaign_id === CID)!.state, "sent");
  assertEquals(s.queue.find((q) => q.campaign_id === CID2)!.state, "queued");
});

Deno.test("double cron: an entry already sending is never claimed again", async () => {
  const s = baseState({ campaigns: [customCampaign()], queue: [queuedRow(CID, { state: "sending" })] });
  const f = mockFetch();
  const r = await runQueueOnce(deps(s, f));
  assertEquals(r.body.result, "empty");
  assertEquals(f.calls.length, 0);
});

Deno.test("success: campaign live, queue sent, owner notified AFTER confirmed send", async () => {
  const s = baseState({ campaigns: [customCampaign()], queue: [queuedRow()] });
  const f = mockFetch();
  const r = await runQueueOnce(deps(s, f));
  assertEquals(r.body.result, "sent");
  assertEquals(r.body.brevoCampaignId, 555);
  const c = s.campaigns[0];
  assertEquals(c.status, "active");
  assert(c.launched_at, "launched_at set");
  assertEquals(c.admin_reviewer, "admin1");
  assertEquals(s.queue[0].state, "sent");
  assert(s.queue[0].sent_at, "sent_at set");
  assert(s.campaign_events.some((e) => e.type === "sent"), "sent event recorded");
  const brevoCreate = f.calls.findIndex((x) => x.url.endsWith("/emailCampaigns") && x.method === "POST");
  const resend = f.calls.findIndex((x) => x.url.includes("resend.com"));
  assert(brevoCreate >= 0 && resend > brevoCreate, "notification only after the Brevo send");
});

Deno.test("definite Brevo create error: queue failed, lock released, NO notification, NO retry", async () => {
  const s = baseState({ campaigns: [customCampaign()], queue: [queuedRow()] });
  const f = mockFetch({ createStatus: 400 });
  const r = await runQueueOnce(deps(s, f));
  assertEquals(r.body.result, "failed");
  assertEquals(r.body.error, "Brevo create failed");
  assertEquals(s.queue[0].state, "failed");
  assertEquals(s.campaigns[0].send_started_at, null, "lock released");
  assertEquals(s.campaigns[0].send_error, "brevo_create 400");
  assertEquals(f.calls.filter((x) => x.url.includes("resend.com")).length, 0);
  assertEquals(s.campaign_events.filter((e) => e.type === "sent").length, 0);
});

Deno.test("uncertain Brevo outcome: needs_review, Brevo id kept, NO notification, NO retry", async () => {
  const s = baseState({ campaigns: [customCampaign()], queue: [queuedRow()] });
  const f = mockFetch({ sendThrows: true });
  const r = await runQueueOnce(deps(s, f));
  assertEquals(r.body.result, "needs_review");
  assertEquals(s.queue[0].state, "needs_review");
  assertEquals(s.campaigns[0].send_error, "uncertain");
  assertEquals(s.campaigns[0].brevo_campaign_id, 555, "Brevo id persisted before sendNow");
  assertEquals(f.calls.filter((x) => x.url.includes("/sendNow")).length, 1, "no automatic retry");
  assertEquals(f.calls.filter((x) => x.url.includes("resend.com")).length, 0);
});

Deno.test("legacy campaign in queue is refused (not_eligible), never sent by the v2 engine", async () => {
  const s = baseState({ campaigns: [customCampaign(CID, { email_content: { version: 1 }, message_html: null })], queue: [queuedRow()] });
  const f = mockFetch();
  const r = await runQueueOnce(deps(s, f));
  assertEquals(r.body.result, "failed");
  assertEquals(r.body.error, "not_eligible");
  assertEquals(f.calls.length, 0);
});

Deno.test("test campaign in queue is refused (not_eligible)", async () => {
  const s = baseState({ campaigns: [customCampaign()], queue: [queuedRow()] });
  s.testCampaigns.add(CID);
  const f = mockFetch();
  const r = await runQueueOnce(deps(s, f));
  assertEquals(r.body.result, "failed");
  assertEquals(r.body.error, "not_eligible");
  assertEquals(f.calls.length, 0);
});

Deno.test("campaign no longer pending is refused (not_eligible)", async () => {
  const s = baseState({ campaigns: [customCampaign(CID, { status: "active" })], queue: [queuedRow()] });
  const f = mockFetch();
  const r = await runQueueOnce(deps(s, f));
  assertEquals(r.body.error, "not_eligible");
  assertEquals(f.calls.length, 0);
});
