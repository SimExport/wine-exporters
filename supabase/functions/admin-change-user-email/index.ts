import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_AUDIENCE_ID = "470ca467-0abf-4a5a-8453-722732a7e4a8";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const targetUserId: string | undefined = body.user_id;
    const newEmailRaw: string | undefined = body.new_email;
    if (!targetUserId || !newEmailRaw) return json({ error: "missing_params" }, 400);
    const newEmail = String(newEmailRaw).trim().toLowerCase();
    if (!isValidEmail(newEmail)) return json({ error: "invalid_email" }, 400);

    // Get current user info
    const { data: targetUser, error: getErr } = await admin.auth.admin.getUserById(targetUserId);
    if (getErr || !targetUser?.user) return json({ error: "user_not_found" }, 404);
    const oldEmail = targetUser.user.email ?? null;

    if (oldEmail && oldEmail.toLowerCase() === newEmail) {
      return json({ error: "same_email" }, 400);
    }

    // Check duplicate (list and scan)
    let page = 1;
    const perPage = 1000;
    let duplicate = false;
    while (true) {
      const { data: list, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) break;
      if (list.users.some((u) => u.id !== targetUserId && u.email?.toLowerCase() === newEmail)) {
        duplicate = true;
        break;
      }
      if (list.users.length < perPage) break;
      page++;
    }
    if (duplicate) return json({ error: "email_already_used" }, 409);

    // Update auth user (immediate, no confirmation email)
    const { error: updErr } = await admin.auth.admin.updateUserById(targetUserId, {
      email: newEmail,
      email_confirm: true,
    });
    if (updErr) return json({ error: updErr.message }, 400);

    // Side-effects (best effort, never fail the request)
    const sideEffects: Record<string, string> = {};

    // Stripe customer email
    try {
      const { data: profile } = await admin
        .from("profiles")
        .select("stripe_customer_id")
        .eq("user_id", targetUserId)
        .maybeSingle();
      const stripeCustomerId = profile?.stripe_customer_id;
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (stripeCustomerId && stripeKey) {
        const res = await fetch(`https://api.stripe.com/v1/customers/${stripeCustomerId}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${stripeKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ email: newEmail }).toString(),
        });
        sideEffects.stripe = res.ok ? "updated" : `failed_${res.status}`;
      } else {
        sideEffects.stripe = "skipped";
      }
    } catch (e: any) {
      sideEffects.stripe = `error_${e?.message ?? "unknown"}`;
    }

    // Resend audience
    try {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        if (oldEmail) {
          await fetch(
            `https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}/contacts/${encodeURIComponent(oldEmail)}`,
            { method: "DELETE", headers: { Authorization: `Bearer ${resendKey}` } },
          );
        }
        const { data: profile } = await admin
          .from("profiles")
          .select("contact_name")
          .eq("user_id", targetUserId)
          .maybeSingle();
        const firstName = (profile?.contact_name ?? "").trim().split(/\s+/)[0] ?? "";
        const res = await fetch(
          `https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}/contacts`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email: newEmail, first_name: firstName, subscribed: true }),
          },
        );
        sideEffects.resend = res.ok ? "updated" : `failed_${res.status}`;
      } else {
        sideEffects.resend = "skipped";
      }
    } catch (e: any) {
      sideEffects.resend = `error_${e?.message ?? "unknown"}`;
    }

    console.log("admin-change-user-email success", {
      actor: userData.user.id,
      target: targetUserId,
      oldEmail,
      newEmail,
      sideEffects,
    });

    return json({ success: true, old_email: oldEmail, new_email: newEmail, side_effects: sideEffects });
  } catch (e: any) {
    console.error("admin-change-user-email error:", e);
    return json({ error: e?.message ?? "server_error" }, 500);
  }
});