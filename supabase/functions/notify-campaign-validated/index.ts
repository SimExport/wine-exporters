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
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId }: Payload = await req.json();
    if (!campaignId) throw new Error("campaignId required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: campaign, error } = await admin
      .from("campaigns")
      .select("id, user_id, name, target_markets, markets")
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

    const marketsArr: string[] = (campaign.target_markets?.length ? campaign.target_markets : campaign.markets) || [];
    const marketsLabel = marketsArr.join(", ");

    const appUrl = `https://wine-exporters.com/campaigns/${campaign.id}`;

    const t = isEn
      ? {
          subject: `✅ Your campaign "${campaign.name}" is validated and now sending`,
          h1: "Your campaign is live",
          intro: `Great news! Your campaign <strong style="color:#59191F;">${campaign.name}</strong> has been validated by our team and is now being sent.`,
          markets: marketsLabel ? `Target markets: <strong>${marketsLabel}</strong>.` : "",
          delay: "⏱ The first results (opens, replies, prospects) will appear within <strong>7 to 10 days</strong> on average.",
          cta: "Track my campaign",
          footer: "— The WineExporters team",
        }
      : {
          subject: `✅ Votre campagne "${campaign.name}" est validée et en cours d'envoi`,
          h1: "Votre campagne est lancée",
          intro: `Bonne nouvelle ! Votre campagne <strong style="color:#59191F;">${campaign.name}</strong> vient d'être validée par notre équipe et est désormais en cours d'envoi.`,
          markets: marketsLabel ? `Marchés ciblés : <strong>${marketsLabel}</strong>.` : "",
          delay: "⏱ Les premiers résultats (ouvertures, réponses, prospects) apparaîtront sous <strong>7 à 10 jours</strong> en moyenne.",
          cta: "Suivre ma campagne",
          footer: "— L'équipe WineExporters",
        };

    const html = `
      <div style="font-family: Arial, sans-serif; background-color: #f5f1ee; padding: 32px 16px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(89,25,31,0.08);">
          <div style="background-color: #59191F; padding: 24px 32px; text-align: center;">
            <div style="color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">WineExporters</div>
            <div style="color: #e8d4d6; font-size: 12px; margin-top: 4px;">by ExportVins</div>
          </div>
          <div style="padding: 32px;">
            <h1 style="color: #59191F; font-size: 22px; margin: 0 0 16px;">${t.h1}</h1>
            <p style="color: #333333; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">${t.intro}</p>
            ${t.markets ? `<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px;">${t.markets}</p>` : ""}
            <p style="color: #333333; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">${t.delay}</p>
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

    await resend.emails.send({
      from: "WineExporters <notifications@resend.dev>",
      to: [userEmail],
      bcc: ["simon@exportvins.fr"],
      subject: t.subject,
      html,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("notify-campaign-validated error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);