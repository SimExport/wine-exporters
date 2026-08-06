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
  /** When true, build the email and return it without sending anything. */
  preview?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId, preview }: Payload = await req.json();
    if (!campaignId) throw new Error("campaignId required");

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

    // Count qualified prospects (form respondents + imported clickers)
    const [{ count: respondentsCount }, { count: clickersCount }] = await Promise.all([
      admin
        .from("campaign_interested_contacts")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId),
      admin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .eq("source", "click"),
    ]);
    const nRespondents = respondentsCount ?? 0;
    const nClickers = clickersCount ?? 0;

    const appUrl = `https://wine-exporters.com/campaigns/${campaign.id}`;

    const nQualified = nRespondents + nClickers;
    const teaserFr = nQualified > 0
      ? `Vous avez <strong>${nQualified} prospect${nQualified > 1 ? "s" : ""} qualifié${nQualified > 1 ? "s" : ""}</strong> à retrouver dans votre espace.`
      : "Retrouvez le détail des interactions et les prospects qualifiés dans votre espace.";
    const teaserEn = nQualified > 0
      ? `You have <strong>${nQualified} qualified prospect${nQualified > 1 ? "s" : ""}</strong> waiting in your account.`
      : "Find the full interaction details and qualified prospects in your account.";

    const t = isEn
      ? {
          subject: `🎉 Your campaign "${campaign.name}" is complete — results are available`,
          h1: "Your campaign results are in",
          intro: `Your campaign <strong style="color:#59191F;">${campaign.name}</strong> is now complete.`,
          teaser: teaserEn,
          next: "Open your campaign to review qualified prospects and plan the next steps.",
          cta: "See my results",
          footer: "— The WineExporters team",
        }
      : {
          subject: `🎉 Votre campagne "${campaign.name}" est terminée — les résultats sont disponibles`,
          h1: "Les résultats de votre campagne sont disponibles",
          intro: `Votre campagne <strong style="color:#59191F;">${campaign.name}</strong> est désormais terminée.`,
          teaser: teaserFr,
          next: "Ouvrez votre campagne pour consulter les prospects qualifiés et préparer les prochaines étapes.",
          cta: "Voir mes résultats",
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
            <p style="color: #333333; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">${t.teaser}</p>
            <p style="color: #333333; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">${t.next}</p>
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

    if (preview) {
      return new Response(
        JSON.stringify({
          preview: true,
          subject: t.subject,
          html,
          to: userEmail,
          bcc: "simon@exportvins.fr",
          qualifiedCount: nQualified,
          respondents: nRespondents,
          clickers: nClickers,
          language: isEn ? "en" : "fr",
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const sendResult = await resend.emails.send({
      from: "WineExporters <notifications@exportvins.fr>",
      to: [userEmail],
      bcc: ["simon@exportvins.fr"],
      subject: t.subject,
      html,
    });
    console.log("notify-campaign-completed resend result:", JSON.stringify(sendResult));
    const sendErr = (sendResult as any)?.error;
    await admin.from("campaign_email_logs").insert({
      campaign_id: campaignId,
      event_type: "campaign_completed",
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
    console.error("notify-campaign-completed error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);