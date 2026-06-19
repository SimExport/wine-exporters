import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  campaignId: string;
  count: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId, count }: Payload = await req.json();
    if (!campaignId) throw new Error("campaignId required");
    const safeCount = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: campaign, error } = await admin
      .from("campaigns")
      .select("id, user_id, name")
      .eq("id", campaignId)
      .single();
    if (error || !campaign) throw error || new Error("Campaign not found");

    const { data: userData, error: userErr } = await admin.auth.admin.getUserById(campaign.user_id);
    if (userErr || !userData?.user?.email) throw userErr || new Error("User email not found");
    const userEmail = userData.user.email;

    const { data: settings } = await admin
      .from("user_settings")
      .select("ui_language")
      .eq("user_id", campaign.user_id)
      .maybeSingle();
    const lang = (settings?.ui_language || "fr").toLowerCase();
    const isEn = lang === "en";

    const appUrl = `https://wine-exporters.com/campaigns/${campaign.id}`;

    const t = isEn
      ? {
          subject: `🎯 ${safeCount} interested contact${safeCount > 1 ? "s" : ""} available for your campaign "${campaign.name}"`,
          h1: "Your interested contacts are ready",
          intro: `Good news! <strong>${safeCount}</strong> interested contact${safeCount > 1 ? "s" : ""} from your campaign <strong style="color:#59191F;">${campaign.name}</strong> have been added to your workspace.`,
          howToTitle: "How to access them",
          steps: [
            'Open the <strong>Campaigns</strong> tab in the left sidebar.',
            `Click on your campaign <strong>"${campaign.name}"</strong>.`,
            'Scroll to the <strong>Interested contacts</strong> section.',
            'Click <strong>Add to CRM</strong> on each contact to start following up.',
          ],
          cta: "View my interested contacts",
          footer: "— The WineExporters team",
        }
      : {
          subject: `🎯 ${safeCount} contact${safeCount > 1 ? "s" : ""} intéressé${safeCount > 1 ? "s" : ""} disponible${safeCount > 1 ? "s" : ""} pour votre campagne « ${campaign.name} »`,
          h1: "Vos contacts intéressés sont disponibles",
          intro: `Bonne nouvelle ! <strong>${safeCount}</strong> contact${safeCount > 1 ? "s" : ""} intéressé${safeCount > 1 ? "s" : ""} issu${safeCount > 1 ? "s" : ""} de votre campagne <strong style="color:#59191F;">${campaign.name}</strong> ${safeCount > 1 ? "ont" : "a"} été ajouté${safeCount > 1 ? "s" : ""} dans votre espace.`,
          howToTitle: "Comment les retrouver",
          steps: [
            'Ouvrez le menu <strong>Campagnes</strong> dans la barre latérale.',
            `Cliquez sur votre campagne <strong>« ${campaign.name} »</strong>.`,
            'Faites défiler jusqu\'à la section <strong>Contacts intéressés</strong>.',
            'Cliquez sur <strong>Ajouter au CRM</strong> sur chaque contact pour le suivre.',
          ],
          cta: "Voir mes contacts intéressés",
          footer: "— L'équipe WineExporters",
        };

    const stepsHtml = t.steps
      .map(
        (s) =>
          `<li style="color:#333333;font-size:15px;line-height:1.6;margin:0 0 8px;">${s}</li>`,
      )
      .join("");

    const html = `
      <div style="font-family: Arial, sans-serif; background-color: #f5f1ee; padding: 32px 16px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(89,25,31,0.08);">
          <div style="background-color: #59191F; padding: 24px 32px; text-align: center;">
            <div style="color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">WineExporters</div>
            <div style="color: #e8d4d6; font-size: 12px; margin-top: 4px;">by ExportVins</div>
          </div>
          <div style="padding: 32px;">
            <h1 style="color: #59191F; font-size: 22px; margin: 0 0 16px;">${t.h1}</h1>
            <p style="color: #333333; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">${t.intro}</p>
            <h2 style="color:#59191F;font-size:16px;margin:0 0 12px;">${t.howToTitle}</h2>
            <ol style="padding-left: 20px; margin: 0 0 28px;">${stepsHtml}</ol>
            <p style="margin: 0 0 32px; text-align: center;">
              <a href="${appUrl}" style="background-color: #59191F; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 15px;">
                ${t.cta}
              </a>
            </p>
            <p style="color: #888888; font-size: 12px; margin: 0; border-top: 1px solid #eeeeee; padding-top: 20px;">${t.footer}</p>
          </div>
        </div>
      </div>
    `;

    const sendResult = await resend.emails.send({
      from: "WineExporters <notifications@exportvins.fr>",
      to: [userEmail],
      bcc: ["simon@exportvins.fr"],
      subject: t.subject,
      html,
    });
    console.log("notify-campaign-interested-contacts resend result:", JSON.stringify(sendResult));
    const sendErr = (sendResult as any)?.error;
    await admin.from("campaign_email_logs").insert({
      campaign_id: campaignId,
      event_type: "interested_contacts_uploaded",
      recipient: userEmail,
      bcc: "simon@exportvins.fr",
      subject: t.subject,
      status: sendErr ? "failed" : "sent",
      error_message: sendErr ? JSON.stringify(sendErr) : null,
      resend_id: (sendResult as any)?.data?.id ?? null,
    });
    if (sendErr) {
      throw new Error(`Resend error: ${JSON.stringify((sendResult as any).error)}`);
    }

    return new Response(JSON.stringify({ success: true, sendResult }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("notify-campaign-interested-contacts error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);