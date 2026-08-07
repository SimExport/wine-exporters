import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BROCHURE_URL =
  "https://drive.google.com/file/d/1RijngSRBNv7pBxHAU_2ONOPVzEAMH_5V/view?usp=sharing";
const VIDEO_URL =
  "https://app.supademo.com/demo/cmsisxkjk2b9wqmaa2mnkakvr?utm_source=link";
const BOOKING_URL = "https://calendar.app.google/xPLu8ru2PpdC2uoG8";

function clean(s: unknown, max = 255): string {
  if (typeof s !== "string") return "";
  return s.trim().slice(0, max);
}

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml(firstName: string, locale: string) {
  const name = escapeHtml(firstName);
  const fr = locale !== "en";
  const title = fr ? "Votre brochure et votre vidéo" : "Your brochure and video";
  const intro = fr
    ? `Bonjour ${name}, voici les deux documents demandés.`
    : `Hi ${name}, here are the two documents you asked for.`;
  const brochureIntro = fr
    ? "Vous préférez lire un document ?"
    : "Prefer to read a document?";
  const brochureLabel = fr ? "Accéder à la brochure ici" : "Access the brochure here";
  const videoIntro = fr
    ? "Vous préférez regarder une démo ?"
    : "Prefer to watch a demo?";
  const videoLabel = fr ? "Regarder la démo ici" : "Watch the demo here";
  const bookingLabel = fr
    ? "Prendre un rendez-vous avec Simon, le fondateur"
    : "Book a meeting with Simon, the founder";
  const closing = fr
    ? "Si vous voulez qu'on regarde ensemble votre cas précis, répondez simplement à cet email."
    : "If you want us to look at your specific case together, just reply to this email.";
  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>${title}</title></head>
  <body style="margin:0;padding:0;background-color:#faf6f0;font-family:Rubik,Arial,Helvetica,sans-serif;color:#1a1a1a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf6f0;padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr><td align="center" style="padding-bottom:28px;">
            <div style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#59191F;">WineExporters</div>
            <div style="font-size:12px;color:#8a7a70;letter-spacing:0.06em;">by ExportVins</div>
          </td></tr>
          <tr><td style="background-color:#ffffff;border:1px solid #e7ddd2;border-radius:14px;padding:36px 32px;">
            <h1 style="margin:0 0 20px 0;font-family:Georgia,serif;font-size:24px;font-weight:600;color:#59191F;">${title}</h1>
            <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;">${intro}</p>
            <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;">${brochureIntro}</p>
            <p style="margin:0 0 22px 0;">
              <a href="${BROCHURE_URL}" style="display:inline-block;background-color:#59191F;color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:8px;font-size:15px;font-weight:600;">${brochureLabel}</a>
            </p>
            <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;">${videoIntro}</p>
            <p style="margin:0 0 24px 0;">
              <a href="${VIDEO_URL}" style="display:inline-block;border:1px solid #C9A84C;color:#59191F;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:15px;font-weight:600;">${videoLabel}</a>
            </p>
            <div style="height:1px;background-color:#efe6da;margin:24px 0;"></div>
            <p style="margin:0;font-size:15px;line-height:1.6;">${closing}</p>
            <p style="margin:14px 0 0 0;font-size:14px;line-height:1.6;">
              <a href="${BOOKING_URL}" style="color:#59191F;text-decoration:underline;font-weight:600;">${bookingLabel}</a>
            </p>
            <p style="margin:20px 0 0 0;font-size:15px;line-height:1.6;">
              <strong style="color:#59191F;">Simon Lemonnier</strong><br />
              <span style="color:#8a7a70;font-size:13px;">WineExporters by ExportVins</span>
            </p>
          </td></tr>
          <tr><td align="center" style="padding-top:20px;">
            <p style="margin:0;font-size:12px;color:#8a7a70;">
              <a href="https://wine-exporters.com" style="color:#59191F;text-decoration:none;font-weight:600;">wine-exporters.com</a>
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const body = await req.json();
    const payload = {
      first_name: clean(body?.first_name, 100),
      domain_name: clean(body?.domain_name, 200),
      email: clean(body?.email, 255).toLowerCase(),
      phone: clean(body?.phone, 40) || null,
      locale: clean(body?.locale, 5) === "en" ? "en" : "fr",
      source: clean(body?.source, 50) || "emelia",
    };

    if (!payload.first_name || !payload.domain_name || !payload.email) {
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error: dbError } = await supabase.from("brochure_leads").insert(payload);
    if (dbError) console.error("brochure_leads insert error:", dbError);

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (apiKey) {
      try {
        const resend = new Resend(apiKey);
        const result = await resend.emails.send({
          from: "Simon Lemonnier <simon@exportvins.fr>",
          to: [payload.email],
          bcc: ["simon@exportvins.fr"],
          subject:
            payload.locale === "en"
              ? "Your WineExporters brochure and video"
              : "Votre brochure et votre vidéo WineExporters",
          html: buildHtml(payload.first_name, payload.locale),
        });
        if ((result as any)?.error) console.error("Resend error:", (result as any).error);
      } catch (e) {
        console.error("Resend send failed:", e);
      }
    } else {
      console.error("RESEND_API_KEY not configured");
    }

    const slackUrl = Deno.env.get("SLACK_WEBHOOK_URL");
    if (slackUrl) {
      try {
        await fetch(slackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: [
              "📄 *Nouvelle demande de brochure (trafic Emelia)*",
              `*Prénom :* ${payload.first_name}`,
              `*Domaine :* ${payload.domain_name}`,
              `*Email :* ${payload.email}`,
              payload.phone ? `*Téléphone :* ${payload.phone}` : null,
            ].filter(Boolean).join("\n"),
          }),
        });
      } catch (e) {
        console.error("Slack notify failed:", e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, brochure_url: BROCHURE_URL, video_url: VIDEO_URL }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (e: any) {
    console.error("submit-brochure-request error:", e);
    return new Response(JSON.stringify({ error: "server_error", detail: e?.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});