import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { authorizeResults, internalJob, withResultOperation } from "../_shared/campaign-results-auth.ts";

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

    const access = await authorizeResults(req, admin);
    if (!access) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    if (access === "internal" && !await internalJob(req, admin, campaignId, "notify")) return new Response(JSON.stringify({ error: "Invalid result job lease" }), { status: 409, headers: corsHeaders });

    const { data: campaign, error } = await admin
      .from("campaigns")
      .select("id, user_id, name, status")
      .eq("id", campaignId)
      .single();
    if (error || !campaign) throw error || new Error("Campaign not found");
    const test = await admin.rpc("is_test_campaign", { _id: campaignId });
    if (test.error) throw test.error;
    if (test.data) return new Response(JSON.stringify({ skipped: true }), { status: 200, headers: corsHeaders });
    if (!preview && campaign.status !== "results") throw new Error("Results are not available");

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
    const [{ count: respondentsCount, error: respondentsError }, { count: clickersCount, error: clickersError }] = await Promise.all([
      admin
        .from("campaign_interested_contacts")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .not("contact_name", "is", null),
      admin
        .from("campaign_interested_contacts")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .is("contact_name", null),
    ]);
    if (respondentsError || clickersError) throw respondentsError ?? clickersError;
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

    const previous = await admin.from("campaign_email_logs").select("id").eq("campaign_id", campaignId).eq("event_type", "campaign_completed").eq("status", "sent").limit(1);
    if (previous.error) throw previous.error;
    if (previous.data?.length) return new Response(JSON.stringify({ success: true, deduplicated: true }), { status: 200, headers: corsHeaders });
    const ensure = await admin.from("campaign_result_jobs").upsert({ campaign_id: campaignId, stage: "notify", status: "pending" }, { onConflict: "campaign_id", ignoreDuplicates: true });
    if (ensure.error) throw ensure.error;
    const claimed = await admin.from("campaign_result_jobs").update({ notification_state: "sending", notification_attempted_at: new Date().toISOString() }).eq("campaign_id", campaignId).eq("notification_state", "pending").select("campaign_id");
    if (claimed.error) throw claimed.error;
    if (!claimed.data?.length) {
      const marker = await admin.from("campaign_result_jobs").select("notification_state").eq("campaign_id", campaignId).single();
      if (marker.error) throw marker.error;
      if (marker.data.notification_state === "sent") return new Response(JSON.stringify({ success: true, deduplicated: true }), { status: 200, headers: corsHeaders });
      throw new Error("Notification outcome uncertain: reconciliation required; no automatic resend");
    }
    // Durable claim BEFORE sending: ambiguous failures never trigger another email.
    const sendResult = await resend.emails.send({
      from: "WineExporters <notifications@exportvins.fr>",
      to: [userEmail],
      bcc: ["simon@exportvins.fr"],
      subject: t.subject,
      html,
    });
    console.log("notify-campaign-completed resend result:", JSON.stringify(sendResult));
    const sendErr = (sendResult as any)?.error;
    const log = await admin.from("campaign_email_logs").insert({
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
      const failedMarker = await admin.from("campaign_result_jobs").update({ notification_state: "uncertain", last_error: "Resend failed; reconciliation required" }).eq("campaign_id", campaignId);
      if (failedMarker.error) console.error("Notification marker write failed", failedMarker.error.message);
      throw new Error(`Resend error: ${JSON.stringify((sendResult as any).error)}`);
    }
    const marker = await admin.from("campaign_result_jobs").update({ notification_state: "sent", notification_sent_at: new Date().toISOString(), resend_id: (sendResult as any)?.data?.id ?? null }).eq("campaign_id", campaignId);
    if (marker.error || log.error) throw new Error("Notification sent but persistence incomplete: reconciliation required");

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

serve((req) => withResultOperation(req, handler));