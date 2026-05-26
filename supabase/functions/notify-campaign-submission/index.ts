import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const slackWebhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  campaignName: string;
  userEmail: string;
  markets: string[];
  campaignId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignName, userEmail, markets, campaignId }: NotificationRequest = await req.json();

    console.log("Received notification request:", { campaignName, userEmail, markets, campaignId });

    const marketsList = markets.length > 0 ? markets.join(", ") : "Aucun marché spécifié";
    const adminUrl = `https://dmgafmigqfycyaopdviw.lovableproject.com/admin/campaigns`;

    // Send Email via Resend
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7c3aed;">🚀 Nouvelle campagne soumise</h1>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>👤 Client :</strong> ${userEmail}</p>
          <p><strong>🍷 Campagne :</strong> ${campaignName}</p>
          <p><strong>🌍 Marchés ciblés :</strong> ${marketsList}</p>
        </div>
        <p style="margin-top: 20px;">
          <a href="${adminUrl}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Voir dans le dashboard admin
          </a>
        </p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          Cet email a été envoyé automatiquement par ExportVins.
        </p>
      </div>
    `;

    console.log("Sending email to simon@exportvins.fr...");
    
    const emailResponse = await resend.emails.send({
      from: "ExportVins <notifications@resend.dev>",
      to: ["simon@exportvins.fr"],
      subject: `🚀 Nouvelle campagne soumise : ${campaignName}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    try {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const sendErr = (emailResponse as any)?.error;
      await admin.from("campaign_email_logs").insert({
        campaign_id: campaignId,
        event_type: "campaign_submission",
        recipient: "simon@exportvins.fr",
        bcc: null,
        subject: `🚀 Nouvelle campagne soumise : ${campaignName}`,
        status: sendErr ? "failed" : "sent",
        error_message: sendErr ? JSON.stringify(sendErr) : null,
        resend_id: (emailResponse as any)?.data?.id ?? null,
      });
    } catch (logErr) {
      console.error("Failed to log email:", logErr);
    }

    // Send Slack notification
    if (slackWebhookUrl) {
      console.log("Sending Slack notification...");
      
      const slackMessage = {
        text: `🔔 Nouvelle demande de campagne !\n\n👤 Client : ${userEmail}\n🍷 Campagne : ${campaignName}\n🌍 Marchés ciblés : ${marketsList}\n\n<${adminUrl}|Voir dans le dashboard>`,
      };

      const slackResponse = await fetch(slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slackMessage),
      });

      console.log("Slack notification sent:", slackResponse.status);
    } else {
      console.log("No Slack webhook URL configured, skipping Slack notification");
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-campaign-submission:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
