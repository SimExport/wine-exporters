import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface DemoRequestPayload {
  first_name: string;
  last_name: string;
  email: string;
  domain_name: string;
  region?: string;
  annual_volume?: string;
  message?: string;
  consent: boolean;
}

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function clean(s: unknown, max = 500): string {
  if (typeof s !== "string") return "";
  return s.trim().slice(0, max);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as DemoRequestPayload;

    const payload = {
      first_name: clean(body.first_name, 100),
      last_name: clean(body.last_name, 100),
      email: clean(body.email, 255).toLowerCase(),
      domain_name: clean(body.domain_name, 200),
      region: clean(body.region, 100) || null,
      annual_volume: clean(body.annual_volume, 50) || null,
      message: clean(body.message, 2000) || null,
      consent: !!body.consent,
    };

    if (!payload.first_name || !payload.last_name || !payload.email || !payload.domain_name) {
      return new Response(JSON.stringify({ error: "missing_fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (!isValidEmail(payload.email)) {
      return new Response(JSON.stringify({ error: "invalid_email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (!payload.consent) {
      return new Response(JSON.stringify({ error: "consent_required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error } = await supabase.from("demo_requests").insert(payload);
    if (error) {
      console.error("DB insert error:", error);
      return new Response(JSON.stringify({ error: "db_error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Slack notification
    const slackUrl = Deno.env.get("SLACK_WEBHOOK_URL");
    if (slackUrl) {
      const text = [
        "🍇 *Nouvelle demande de démo WineExporters*",
        `*Nom :* ${payload.first_name} ${payload.last_name}`,
        `*Email :* ${payload.email}`,
        `*Domaine :* ${payload.domain_name}`,
        payload.region ? `*Région :* ${payload.region}` : null,
        payload.annual_volume ? `*Volume annuel :* ${payload.annual_volume}` : null,
        payload.message ? `*Message :* ${payload.message}` : null,
      ].filter(Boolean).join("\n");
      try {
        await fetch(slackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
      } catch (e) {
        console.error("Slack notify failed:", e);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    console.error("submit-demo-request error:", e);
    return new Response(JSON.stringify({ error: "server_error", detail: e?.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});