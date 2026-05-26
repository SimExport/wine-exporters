import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    logStep("Event received", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id || session.client_reference_id;
        const customerId = session.customer as string;

        if (!userId) {
          logStep("ERROR", { message: "No user_id found in session", sessionId: session.id });
          break;
        }

        logStep("checkout.session.completed", { userId, customerId, sessionId: session.id });

        // Update profiles: set subscription_plan, campaigns_remaining, stripe_customer_id
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({
            subscription_plan: "monthly",
            campaigns_remaining: 1,
            stripe_customer_id: customerId,
          })
          .eq("user_id", userId);

        if (profileError) {
          logStep("ERROR updating profiles", { error: profileError.message });
        } else {
          logStep("Profile updated successfully", { userId });
        }

        // Upsert user_roles: ensure role is 'paid' (one row per user)
        const { error: roleUpsertError } = await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId, role: "paid" }, { onConflict: "user_id" });

        if (roleUpsertError) {
          logStep("ERROR upserting user_roles", { error: roleUpsertError.message });
        } else {
          logStep("User role set to paid", { userId });
        }

        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

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
          .eq("user_id", userId);

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
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
