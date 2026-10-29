// This module has no runtime SDK imports so the payment flow can be tested with mocks.
export const WINEEXPORTERS_PRICES = new Set([
  "price_1TI7IsK7E7uiZKC0vIcHojGh",
  "price_1SjHFEK7E7uiZKC06cBOE57l",
  "price_1T17dgK7E7uiZKC0kOXpLP7Y",
]);
export const PAYMENT_REDIRECT = "https://wine-exporters.com/set-password";
const SENDING = "notification_in_flight:";
const UNCERTAIN = "notification_outcome_unknown:";
const idOf = (value: any): string | null => typeof value === "string" ? value : value?.id ?? null;
const check = (result: any, step: string) => {
  if (result.error) throw new Error(step);
  return result.data;
};

export async function paidWineSubscription(stripe: any, invoice: any) {
  if (invoice.status !== "paid" || invoice.amount_remaining !== 0) return null;
  const subscriptionId = idOf(invoice.parent?.subscription_details?.subscription ?? invoice.subscription);
  if (!subscriptionId) return null;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  if (subscription.status !== "active" || idOf(subscription.customer) !== idOf(invoice.customer)) return null;
  const invoicePrices: string[] = [];
  for await (const line of stripe.invoices.listLineItems(invoice.id, { limit: 100 })) {
    const price = idOf(line.pricing?.price_details?.price ?? line.price);
    if (price) invoicePrices.push(price);
  }
  const subscriptionPrices: string[] = [];
  for await (const item of stripe.subscriptionItems.list({ subscription: subscriptionId, limit: 100 })) {
    const price = idOf(item.price);
    if (price) subscriptionPrices.push(price);
  }
  // Fail closed for mixed products, not merely any matching line.
  if (!invoicePrices.length || !subscriptionPrices.length ||
      [...invoicePrices, ...subscriptionPrices].some((price) => !WINEEXPORTERS_PRICES.has(price))) return null;
  return subscription;
}

async function findUser(admin: any, email: string) {
  for (let page = 1; ; page++) {
    const data = check(await admin.auth.admin.listUsers({ page, perPage: 1000 }), "user_lookup_failed");
    const user = data.users.find((u: any) => u.email?.trim().toLowerCase() === email);
    if (user) return user;
    if (data.users.length < 1000) return null;
  }
}

export async function activatePaidAccess(admin: any, userId: string, customerId: string) {
  const roles = check(await admin.from("user_roles").select("role").eq("user_id", userId), "role_lookup_failed");
  if (!roles.some((r: any) => r.role === "admin")) {
    if (roles.length) {
      // Conditional update also protects an admin promoted concurrently.
      check(await admin.from("user_roles").update({ role: "paid" }).eq("user_id", userId).neq("role", "admin"), "role_activation_failed");
    } else {
      check(await admin.from("user_roles").upsert({ user_id: userId, role: "paid" },
        { onConflict: "user_id", ignoreDuplicates: true }), "role_creation_failed");
    }
  }
  // Read the plan and counter BEFORE writing: an already paying profile keeps its counter strictly,
  // while a first activation mirrors the legacy webhook with at least one campaign, never a reset.
  const current = check(await admin.from("profiles").select("subscription_plan, campaigns_remaining")
    .eq("user_id", userId).maybeSingle(), "profile_lookup_failed");
  const wasPaying = Boolean(current?.subscription_plan && current.subscription_plan !== "none");
  const activation: Record<string, unknown> = { subscription_plan: "monthly", stripe_customer_id: customerId };
  if (!wasPaying) activation.campaigns_remaining = Math.max(Number(current?.campaigns_remaining) || 0, 1);
  const profiles = check(await admin.from("profiles").update(activation)
    .eq("user_id", userId).select("user_id"), "profile_activation_failed");
  if (profiles.length !== 1) throw new Error("profile_missing");
  // Insert only missing balances, using the database defaults; never reset a balance.
  check(await admin.from("user_credits").upsert({ user_id: userId },
    { onConflict: "user_id", ignoreDuplicates: true }), "credit_initialization_failed");
  const verified = check(await admin.from("user_roles").select("role").eq("user_id", userId), "role_verification_failed");
  if (!verified.some((r: any) => r.role === "paid" || r.role === "admin")) throw new Error("access_incomplete");
}

export async function processFirstPayment(stripe: any, admin: any, eventInvoice: any) {
  if (eventInvoice.billing_reason !== "subscription_create") return "ignored";
  // Re-read Stripe, rather than relying solely on the event snapshot (SEPA included).
  const invoice = await stripe.invoices.retrieve(eventInvoice.id);
  if (invoice.billing_reason !== "subscription_create" || !await paidWineSubscription(stripe, invoice)) return "ignored";
  const customerId = idOf(invoice.customer);
  if (!customerId) throw new Error("customer_missing");
  const customer = await stripe.customers.retrieve(customerId);
  const email = customer.deleted ? null : customer.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("customer_email_missing");

  let job: any;
  const now = new Date().toISOString();
  const inserted = await admin.from("stripe_invitation_jobs").insert({
    invoice_id: invoice.id, stripe_customer_id: customerId, email,
    status: "processing", attempts: 1, updated_at: now,
  }).select().single();
  if (!inserted.error) {
    job = inserted.data;
  } else {
    if (inserted.error.code !== "23505") throw new Error("job_creation_failed");
    const previous = check(await admin.from("stripe_invitation_jobs").select().eq("invoice_id", invoice.id).single(), "job_lookup_failed");
    if (previous.status === "completed") return "completed";
    if (previous.email !== email || previous.stripe_customer_id !== customerId) throw new Error("job_identity_mismatch");
    if (previous.status === "processing" && Date.now() - Date.parse(previous.updated_at) < 10 * 60 * 1000) {
      throw new Error("job_busy_retry_later");
    }
    const claimed = check(await admin.from("stripe_invitation_jobs").update({
      status: "processing", attempts: previous.attempts + 1, updated_at: now,
    }).eq("invoice_id", invoice.id).eq("status", previous.status).eq("updated_at", previous.updated_at)
      .select().maybeSingle(), "job_claim_failed");
    if (!claimed) throw new Error("job_busy_retry_later");
    job = claimed;
  }

  const save = async (values: any) => {
    const updated = check(await admin.from("stripe_invitation_jobs").update({ ...values, updated_at: new Date().toISOString() })
      .eq("invoice_id", invoice.id).eq("status", "processing").eq("attempts", job.attempts)
      .select().single(), "job_save_failed");
    job = updated;
  };
  let invitationId: string | null = null;
  let notificationInFlight = false;
  try {
    let user = await findUser(admin, email);
    // Auth user timestamps are not delivery receipts. An uncertain outcome needs
    // manual reconciliation, for both invites and magic links.
    if (!job.invite_sent && (job.last_error?.startsWith(SENDING) || job.last_error?.startsWith(UNCERTAIN))) {
      throw new Error("notification_outcome_unknown:manual_reconciliation_required");
    }
    if (job.invite_sent && !user) throw new Error("invited_user_missing");

    const existingRoles = user ? check(await admin.from("user_roles").select("role").eq("user_id", user.id), "role_lookup_failed") : [];
    const profile = user ? check(await admin.from("profiles").select("subscription_plan").eq("user_id", user.id).maybeSingle(), "profile_lookup_failed") : null;
    const hadAccess = existingRoles.some((r: any) => r.role === "paid" || r.role === "admin") ||
      Boolean(profile?.subscription_plan && profile.subscription_plan !== "none");
    // A pre-existing pending invitation uses the manual fallback; never resend it
    // or declare this invoice completed based only on an Auth timestamp.
    if (user?.invited_at && !user.last_sign_in_at && !job.invite_sent) {
      throw new Error("notification_outcome_unknown:existing_invitation_requires_reconciliation");
    }
    if (!job.invite_sent && (!user || !hadAccess)) {
      const invitation = check(await admin.from("admin_invitations").insert({
        email, invitation_type: "classic", status: "pending", invited_user_id: user?.id ?? null,
        error_message: "stripe_invoice:" + invoice.id,
      }).select("id").single(), "invitation_log_failed");
      invitationId = invitation.id;
      // Durable marker BEFORE the non-transactional mail call. Never retry uncertain sends blindly.
      const kind = user ? "otp" : "invite";
      await save({ last_error: SENDING + kind, user_id: user?.id ?? null });
      notificationInFlight = true;
      const result = user
        ? await admin.auth.signInWithOtp({ email, options: { emailRedirectTo: PAYMENT_REDIRECT, shouldCreateUser: false } })
        : await admin.auth.admin.inviteUserByEmail(email, { redirectTo: PAYMENT_REDIRECT });
      if (result.error) {
        // A returned upstream error may still have followed mail delivery. Conservatively freeze
        // its outcome rather than sending another email on a Stripe retry.
        throw new Error(UNCERTAIN + kind);
      }
      user = user ?? result.data?.user;
      if (!user) throw new Error(UNCERTAIN + kind);
      await save({ invite_sent: true, user_id: user.id, last_error: null });
      notificationInFlight = false;
      check(await admin.from("admin_invitations").update({ status: "sent", invited_user_id: user.id, error_message: null })
        .eq("id", invitationId), "invitation_log_update_failed");
    }
    if (!user) throw new Error("user_missing");
    await save({ user_id: user.id });
    await activatePaidAccess(admin, user.id, customerId);
    // Repair the matching invitation log after a partial failure, without touching manual logs.
    check(await admin.from("admin_invitations").update({ status: "sent", invited_user_id: user.id, error_message: null })
      .eq("email", email).eq("invitation_type", "classic").eq("status", "pending")
      .eq("error_message", "stripe_invoice:" + invoice.id), "invitation_log_finalize_failed");
    await save({ status: "completed", last_error: null });
    return "completed";
  } catch (error) {
    const reason = notificationInFlight ? (job.last_error ?? UNCERTAIN + "invite") :
      error instanceof Error ? error.message : "activation_failed";
    await save({ status: "failed", last_error: reason });
    throw new Error(reason);
  }
}