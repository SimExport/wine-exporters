import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { activatePaidAccess, paidWineSubscription, processFirstPayment } from "./first-payment.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    logStep("ERROR", { message: "Missing signature or webhook secret" });
    return new Response(JSON.stringify({ error: "Missing signature or webhook secret" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }

  let signatureValidated = false;
  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    signatureValidated = true;

    logStep("Event received", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id || session.client_reference_id;
        const customerId = session.customer as string;

        // Payment Links have no user_id: first paid invoice handles their invitation.
        // A completed checkout can still be unpaid for delayed payment methods.
        if (session.payment_status !== "paid" || !userId || !customerId) break;
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (!subscriptionId) break;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const invoiceId = typeof subscription.latest_invoice === "string" ? subscription.latest_invoice : subscription.latest_invoice?.id;
        if (!invoiceId) break;
        const paidInvoice = await stripe.invoices.retrieve(invoiceId);
        if (paidInvoice.customer !== customerId || !await paidWineSubscription(stripe, paidInvoice)) break;
        await activatePaidAccess(supabaseAdmin, userId, customerId);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        if (invoice.billing_reason === "subscription_create") {
          const result = await processFirstPayment(stripe, supabaseAdmin, invoice);
          logStep("First payment", { invoiceId: invoice.id, result });
          break;
        }

        // Only process subscription renewal invoices (not the first one)
        if (invoice.billing_reason !== "subscription_cycle") {
          logStep("Skipping invoice", { reason: invoice.billing_reason, customerId });
          break;
        }

        logStep("invoice.payment_succeeded (renewal)", { customerId, invoiceId: invoice.id });

        // Find user by stripe_customer_id
        const { data: profile, error: profileFetchError } = await supabaseAdmin
          .from("profiles")
          .select("user_id, campaigns_remaining")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (profileFetchError || !profile) {
          logStep("ERROR finding profile by stripe_customer_id", { 
            error: profileFetchError?.message, 
            customerId 
          });
          break;
        }

        // Reset campaigns_remaining to 1 for the new month
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({ campaigns_remaining: 1 })
          .eq("stripe_customer_id", customerId);

        if (updateError) {
          logStep("ERROR resetting campaigns_remaining", { error: updateError.message });
        } else {
          logStep("campaigns_remaining reset to 1", { userId: profile.user_id, customerId });
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        logStep("customer.subscription.deleted", { customerId, subscriptionId: subscription.id });

        // Find user by stripe_customer_id
        const { data: profile, error: profileFetchError } = await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (profileFetchError || !profile) {
          logStep("ERROR finding profile for cancellation", { 
            error: profileFetchError?.message, 
            customerId 
          });
          break;
        }

        const userId = profile.user_id;

        // Update profiles: set subscription_plan to 'none'
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({ subscription_plan: "none" })
          .eq("user_id", userId);

        if (profileError) {
          logStep("ERROR updating profile on cancellation", { error: profileError.message });
        } else {
          logStep("Profile subscription_plan set to none", { userId });
        }

        // Update user_roles: set role to 'free'
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .update({ role: "free" })
          .eq("user_id", userId)
          .neq("role", "admin");

        if (roleError) {
          logStep("ERROR updating role on cancellation", { error: roleError.message });
        } else {
          logStep("User role set to free", { userId });
        }

        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    // Do not log upstream errors that could contain credentials or customer details.
    logStep("ERROR", { message: signatureValidated ? "Processing failed; retry required" : "Invalid signature" });
    return new Response(JSON.stringify({ error: signatureValidated ? "processing_failed" : "invalid_signature" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: signatureValidated ? 503 : 400,
    });
  }
});
