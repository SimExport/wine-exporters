import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { activatePaidAccess, paidWineSubscription, processFirstPayment, WINEEXPORTERS_PRICES } from "./first-payment.ts";

function fixture(existing = false) {
  const tables: Record<string, any[]> = {
    stripe_invitation_jobs: [], admin_invitations: [],
    profiles: existing ? [{ user_id: "u1", subscription_plan: "none" }] : [],
    user_roles: existing ? [{ user_id: "u1", role: "free" }] : [],
    user_credits: existing ? [{ user_id: "u1", campaign_credits: 7, search_credits: 3, export_credits: 42 }] : [],
  };
  let users: any[] = existing ? [{ id: "u1", email: "buyer@example.test" }] : [];
  let mails = 0;
  let failTable = "";
  let uncertainOtp = false;
  const admin = {
    from(table: string) {
      let op = "select", values: any, opts: any, single = false;
      const filters: ((row: any) => boolean)[] = [];
      const q: any = {
        select() { return q; }, insert(v: any) { op = "insert"; values = v; return q; },
        update(v: any) { op = "update"; values = v; return q; },
        upsert(v: any, o: any) { op = "upsert"; values = v; opts = o; return q; },
        eq(k: string, v: any) { filters.push(r => r[k] === v); return q; },
        neq(k: string, v: any) { filters.push(r => r[k] !== v); return q; },
        single() { single = true; return q; }, maybeSingle() { single = true; return q; },
        then(resolve: any, reject: any) {
          const run = () => {
            if (failTable === table && op === "update") { failTable = ""; return { data: null, error: { message: "mock_failure" } }; }
            let rows = tables[table].filter(r => filters.every(f => f(r)));
            if (op === "insert" || op === "upsert") {
              const duplicate = tables[table].find(r => table === "stripe_invitation_jobs" ? r.invoice_id === values.invoice_id : r.user_id === values.user_id);
              if (duplicate && op === "insert") return { error: { code: "23505" }, data: null };
              if (duplicate) { if (!opts?.ignoreDuplicates) Object.assign(duplicate, values); rows = [duplicate]; }
              else {
                const defaults = table === "stripe_invitation_jobs" ? { invite_sent: false, last_error: null, user_id: null } :
                  table === "user_credits" ? { campaign_credits: 1, search_credits: 1, export_credits: 500 } : { id: "log" + tables[table].length };
                const row = { ...defaults, ...values }; tables[table].push(row); rows = [row];
              }
            } else if (op === "update") rows.forEach(r => Object.assign(r, values));
            return { data: single ? rows[0] ? { ...rows[0] } : null : rows.map(r => ({ ...r })), error: null };
          };
          return Promise.resolve().then(run).then(resolve, reject);
        },
      };
      return q;
    },
    auth: {
      admin: {
        async listUsers({ page }: any) { return { data: { users: page === 1 ? users : [] }, error: null }; },
        async inviteUserByEmail(email: string) {
          mails++;
          const user = { id: "u1", email, invited_at: new Date().toISOString() };
          users = [user]; tables.profiles.push({ user_id: user.id, subscription_plan: "none" });
          tables.user_roles.push({ user_id: user.id, role: "free" });
          return { data: { user }, error: null };
        },
      },
      async signInWithOtp() { mails++; if (uncertainOtp) throw new Error("network timeout"); return { data: {}, error: null }; },
    },
  };
  const invoice: any = { id: "in_test", billing_reason: "subscription_create", status: "paid", amount_remaining: 0, customer: "cus_test", parent: { subscription_details: { subscription: "sub_test" } } };
  let prices = ["price_1TI7IsK7E7uiZKC0vIcHojGh"];
  const stripe = {
    invoices: { async retrieve() { return invoice; }, async *listLineItems() { for (const price of prices) yield { pricing: { price_details: { price } } }; } },
    subscriptions: { async retrieve() { return { id: "sub_test", status: "active", customer: "cus_test" }; } },
    subscriptionItems: { async *list() { for (const price of prices) yield { price: { id: price } }; } },
    customers: { async retrieve() { return { email: "BUYER@example.test" }; } },
  };
  return { admin, stripe, invoice, tables, mails: () => mails, prices: (p: string[]) => { prices = p; },
    fail: (table: string) => { failTable = table; }, uncertain: () => { uncertainOtp = true; } };
}

for (const price of WINEEXPORTERS_PRICES) Deno.test(`first payment accepts ${price}`, async () => {
  const f = fixture(); f.prices([price]); assertEquals(Boolean(await paidWineSubscription(f.stripe, f.invoice)), true);
});
Deno.test("ExportVins and mixed prices excluded", async () => {
  const f = fixture();
  for (const prices of [["price_exportvins_250"], ["price_exportvins_500"], ["price_1TI7IsK7E7uiZKC0vIcHojGh", "price_exportvins_250"]]) {
    f.prices(prices); assertEquals(await processFirstPayment(f.stripe, f.admin, f.invoice), "ignored");
  }
  assertEquals(f.mails(), 0); assertEquals(f.tables.stripe_invitation_jobs.length, 0);
});
Deno.test("SEPA unpaid invoice never invites or activates", async () => {
  const f = fixture(); f.invoice.status = "open"; f.invoice.amount_remaining = 9900;
  assertEquals(await processFirstPayment(f.stripe, f.admin, f.invoice), "ignored");
  assertEquals(f.mails(), 0); assertEquals(f.tables.profiles.length, 0);
});
Deno.test("renewal does not invite", async () => {
  const f = fixture(); f.invoice.billing_reason = "subscription_cycle";
  assertEquals(await processFirstPayment(f.stripe, f.admin, f.invoice), "ignored"); assertEquals(f.mails(), 0);
});
Deno.test("Payment Link without metadata invites once and initializes defaults", async () => {
  const f = fixture();
  assertEquals(await processFirstPayment(f.stripe, f.admin, f.invoice), "completed");
  assertEquals(await processFirstPayment(f.stripe, f.admin, f.invoice), "completed");
  assertEquals(f.mails(), 1); assertEquals(f.tables.user_roles[0].role, "paid");
  assertEquals(f.tables.profiles[0].subscription_plan, "monthly"); assertEquals(f.tables.profiles[0].stripe_customer_id, "cus_test");
  assertEquals(f.tables.user_credits[0], { user_id: "u1", campaign_credits: 1, search_credits: 1, export_credits: 500 });
  assertEquals(f.tables.admin_invitations[0].status, "sent");
});
Deno.test("existing free account gets one login link and keeps credits", async () => {
  const f = fixture(true); await processFirstPayment(f.stripe, f.admin, f.invoice); await processFirstPayment(f.stripe, f.admin, f.invoice);
  assertEquals(f.mails(), 1); assertEquals(f.tables.user_credits[0].campaign_credits, 7);
  assertEquals(f.tables.user_credits[0].search_credits, 3); assertEquals(f.tables.user_credits[0].export_credits, 42);
});
Deno.test("admin role preserved without notification", async () => {
  const f = fixture(true); f.tables.user_roles[0].role = "admin";
  await processFirstPayment(f.stripe, f.admin, f.invoice); assertEquals(f.tables.user_roles[0].role, "admin"); assertEquals(f.mails(), 0);
});
Deno.test("activation failure retries without another invitation", async () => {
  const f = fixture(); f.fail("profiles");
  await assertRejects(() => processFirstPayment(f.stripe, f.admin, f.invoice));
  assertEquals(f.tables.stripe_invitation_jobs[0].status, "failed"); assertEquals(f.mails(), 1);
  assertEquals(await processFirstPayment(f.stripe, f.admin, f.invoice), "completed"); assertEquals(f.mails(), 1);
});
Deno.test("concurrent deliveries claim one job", async () => {
  const f = fixture(); const results = await Promise.allSettled([processFirstPayment(f.stripe, f.admin, f.invoice), processFirstPayment(f.stripe, f.admin, f.invoice)]);
  assertEquals(results.filter(r => r.status === "fulfilled").length, 1); assertEquals(f.mails(), 1);
});
Deno.test("uncertain login delivery remains failed without resend", async () => {
  const f = fixture(true); f.uncertain();
  await assertRejects(() => processFirstPayment(f.stripe, f.admin, f.invoice));
  await assertRejects(() => processFirstPayment(f.stripe, f.admin, f.invoice));
  assertEquals(f.mails(), 1); assertEquals(f.tables.stripe_invitation_jobs[0].status, "failed");
});
Deno.test("direct activation never resets credits", async () => {
  const f = fixture(true); await activatePaidAccess(f.admin, "u1", "cus_test");
  assertEquals(f.tables.user_credits[0].export_credits, 42);
});