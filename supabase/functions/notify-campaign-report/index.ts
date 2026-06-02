import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    // Supabase database webhook payload: { type, table, record, schema, old_record }
    const record = body.record ?? body;
    if (!record?.id || !record?.user_id) {
      return new Response(JSON.stringify({ error: "missing record" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get user email
    const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(record.user_id);
    if (userErr || !userData?.user?.email) {
      console.error("getUserById failed", userErr);
      return new Response(JSON.stringify({ error: "no email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userEmail = userData.user.email;

    // Get contact name from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("contact_name, domain_name")
      .eq("user_id", record.user_id)
      .maybeSingle();

    const greeting = profile?.contact_name?.split(" ")[0] || profile?.domain_name || "Bonjour";

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "email not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
        <p style="font-size: 16px;">Bonjour ${greeting},</p>
        <p style="font-size: 16px; line-height: 1.5;">
          Votre rapport de campagne <strong>${record.campaign_name}</strong> est disponible sur votre espace WineExporters.
        </p>
        <p style="margin: 32px 0;">
          <a href="https://wine-exporters.com/campaigns"
             style="display: inline-block; background: #7c1d2e; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            Consulter mon rapport
          </a>
        </p>
        <p style="font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          WineExporters · <a href="https://wine-exporters.com" style="color: #6b7280;">wine-exporters.com</a>
        </p>
      </div>
    `;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "WineExporters <simon@exportvins.fr>",
        to: [userEmail],
        subject: "Votre rapport de campagne est disponible — WineExporters",
        html,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("Resend error", resp.status, text);
      return new Response(JSON.stringify({ error: "send failed", details: text }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("campaign_reports")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", record.id);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-campaign-report error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});