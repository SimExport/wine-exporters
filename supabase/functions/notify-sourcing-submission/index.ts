import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const slackWebhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  requestId: string;
  userEmail: string;
  domainName?: string | null;
  targetMarket: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requestId, userEmail, domainName, targetMarket }: NotificationRequest = await req.json();
    const adminUrl = `https://wine-exporters.com/admin/recherches`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7c3aed;">🎯 Nouvelle recherche sur-mesure</h1>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>👤 Client :</strong> ${userEmail}</p>
          ${domainName ? `<p><strong>🍷 Domaine :</strong> ${domainName}</p>` : ""}
          <p><strong>🌍 Marché demandé :</strong> ${targetMarket}</p>
          <p><strong>🆔 ID :</strong> ${requestId}</p>
        </div>
        <p>
          <a href="${adminUrl}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Traiter la recherche
          </a>
        </p>
      </div>
    `;

    await resend.emails.send({
      from: "ExportVins <notifications@resend.dev>",
      to: ["simon@exportvins.fr"],
      subject: `🎯 Nouvelle recherche sur-mesure : ${targetMarket}`,
      html,
    });

    if (slackWebhookUrl) {
      await fetch(slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🎯 Nouvelle recherche sur-mesure !\n👤 ${userEmail}${domainName ? ` (${domainName})` : ""}\n🌍 ${targetMarket}\n<${adminUrl}|Traiter>`,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("notify-sourcing-submission error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);