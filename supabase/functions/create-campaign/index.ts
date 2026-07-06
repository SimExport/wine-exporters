// Edge Function: create-campaign
// Orchestrates: fetch data -> generate HTML via Anthropic -> create & send Brevo campaign
// -> update campaign status -> notify user via Resend.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Brevo list IDs per country (exact mapping provided in spec).
const BREVO_LIST_IDS: Record<string, number> = {
  argentina: 134, australia: 135, austria: 136, belgium: 137, brazil: 138,
  china: 139, colombia: 140, croatia: 141, cyprus: 142, "czech republic": 143,
  denmark: 144, estonia: 145, finland: 146, france: 147, germany: 148,
  greece: 149, hungary: 150, india: 151, ireland: 152, italy: 153,
  japan: 154, latvia: 155, lithuania: 156, luxembourg: 157, malta: 158,
  mexico: 159, netherlands: 160, norway: 161, poland: 162, romania: 163,
  russia: 164, serbia: 165, singapore: 166, slovakia: 167, "south africa": 168,
  "south korea": 169, spain: 170, sweden: 171, switzerland: 172, taiwan: 173,
  thailand: 174, usa: 175, "united kingdom": 176, vietnam: 177,
};

function normalizeCountry(c: string): string {
  return c.trim().toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/^united states.*$/, "usa")
    .replace(/^u\.?s\.?a?\.?$/, "usa")
    .replace(/^uk$/, "united kingdom")
    .replace(/^great britain$/, "united kingdom");
}

function extractSubject(html: string, fallback: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const s = m?.[1]?.trim();
  return s && s.length > 0 ? s : fallback;
}

function buildAnthropicUserMessage(data: {
  campaignId: string;
  campaign: any;
  profile: any;
  wines: any[];
  interestUrl: string;
}): string {
  const { campaign, profile, wines, interestUrl } = data;
  const winesBlock = wines.length
    ? wines.map((w) => `- ${w.name ?? "Unnamed"} — ${w.color ?? ""} — ${w.appellation ?? ""} — EXW ${w.exw_price_eur ?? "?"} EUR${w.awards ? ` — Awards: ${w.awards}` : ""}`).join("\n")
    : "(no wines listed)";

  return [
    `# Campaign to generate`,
    `Campaign name: ${campaign.name}`,
    `Target markets: ${(campaign.target_markets ?? campaign.markets ?? []).join(", ") || "n/a"}`,
    ``,
    `# Producer profile`,
    `Domain name: ${profile?.domain_name ?? ""}`,
    `AOC / Appellation: ${profile?.aoc ?? ""}`,
    `Location: ${profile?.location ?? ""}`,
    `Surface: ${profile?.surface_area ?? ""} ha`,
    `Bottles per year: ${profile?.bottles_per_year ?? ""}`,
    `Certifications: ${(profile?.certifications ?? []).join(", ") || "none"}`,
    `Strong points: ${(profile?.strengths ?? []).join(", ") || ""}`,
    `Target buyer: ${profile?.target_buyer_description ?? ""}`,
    `Contact name: ${profile?.contact_name ?? ""}`,
    ``,
    `# Wines`,
    winesBlock,
    ``,
    `CAMPAIGN_INTEREST_URL: ${interestUrl}`,
  ].join("\n");
}

const SYSTEM_PROMPT = `You are an expert email copywriter specializing in French wine export outreach. Your task is to generate a complete HTML email campaign targeting international wine importers on behalf of a French wine producer.

You will receive structured data about the producer (domain name, AOC, location, surface, bottles per year, certifications, strong points, target buyer, wines list with names/colors/appellations/prices, contact name). Use ALL provided information to craft a highly personalized, compelling email.

RULES:
- Write entirely in English
- Tone: direct, professional, never generic. Write as if the producer is speaking personally to the importer
- The email must feel like a real human wrote it, not a template
- Never use hollow phrases like "world-class", "passionate about wine", "unique terroir" without specific facts backing them up
- Lead with the strongest, most specific selling point of this producer
- Subject line: start with {{ contact.COMPANY_NAME }}, followed by a specific compelling hook based on the producer's actual strengths (NOT generic)
- Include {{ unsubscribe }} in the footer
- Include {{ mirror }} as "View in browser" link at the top

HTML STRUCTURE to follow exactly:
- Background: #fbfbfb
- Font: Rubik, Arial, Helvetica, sans-serif (import from Google Fonts)
- Max width: 600px, centered
- Top: "View in browser" link using {{ mirror }}
- Header: bold H1 title (font-size 30px, color #000000) incorporating {{ contact.COMPANY_NAME }} and a specific hook
- Subtitle in italic, small (14px, color #555), summarizing the appellation and key wines
- If a photo URL is provided, display it full width (600px) with border-radius 8px, linked to the CTA URL
- CTA button (first occurrence, before body text): background #be2d2d, white text (#FFFEFE), padding 12px, border-radius 0, centered, linked to CAMPAIGN_INTEREST_URL, label "Request samples & more info"
- Body paragraph (2-3 sentences max): specific introduction of the producer with concrete facts
- Section title "Why [Domain Name] belongs in your portfolio" in uppercase, font-size 13px, color #5a3d2b, letter-spacing 1px
- 4 to 5 bullet points, each with a relevant emoji, bold title, and 2-3 sentences of specific content drawn from the producer data. Cover: terroir/appellation specificity, wine range and prices (mention EXW prices), certifications if any, export readiness, unique differentiator
- Second CTA button: identical to first, same URL
- Closing line: personal, signed by the contact name at the domain
- Footer: domain name, address, {{ unsubscribe }} link

CAMPAIGN_INTEREST_URL will be provided as a variable — insert it exactly as given in all href attributes of CTA buttons and the photo link.

Output ONLY the complete HTML, no explanation, no markdown, no code fences. Start directly with <!DOCTYPE html>.`;

function buildOwnerEmailHtml(campaignName: string, markets: string[]): string {
  const marketsList = markets.length
    ? markets.map((m) => `<span style="display:inline-block;background:#59191F;color:#fff;padding:4px 10px;border-radius:999px;font-size:12px;margin:2px;">${m}</span>`).join(" ")
    : `<em style="color:#888;">n/a</em>`;
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Your campaign is live</title><link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700&display=swap" rel="stylesheet"/></head>
<body style="margin:0;padding:0;background-color:#faf6f0;font-family:Rubik,Arial,Helvetica,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf6f0;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding-bottom:32px;">
          <div style="display:inline-block;padding:12px 20px;border:1px solid #59191F;border-radius:8px;">
            <span style="font-size:20px;font-weight:700;letter-spacing:0.5px;color:#1a1a1a;">Wine<span style="color:#59191F;">Exporters</span></span>
          </div>
        </td></tr>
        <tr><td style="background-color:#ffffff;border:1px solid #e5e5e5;border-radius:12px;padding:40px 32px;">
          <h1 style="margin:0 0 20px 0;font-size:22px;font-weight:600;color:#1a1a1a;line-height:1.3;">Your campaign is live 🚀</h1>
          <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#1a1a1a;">Great news — your campaign <strong style="color:#1a1a1a;">${escapeHtml(campaignName)}</strong> has just been sent to wine importers in your selected markets:</p>
          <p style="margin:0 0 20px 0;line-height:2;">${marketsList}</p>
          <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#1a1a1a;">You'll receive a detailed performance report once results are available (opens, clicks, replies and qualified prospects).</p>
          <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#1a1a1a;">Qualified prospects and responses will appear directly in your WineExporters dashboard as soon as they are available.</p>
          <div style="height:1px;background-color:#e5e5e5;margin:28px 0;"></div>
          <h2 style="margin:0 0 16px 0;font-size:18px;font-weight:600;color:#1a1a1a;">Votre campagne est en ligne 🚀</h2>
          <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#1a1a1a;">Excellente nouvelle — votre campagne <strong style="color:#1a1a1a;">${escapeHtml(campaignName)}</strong> vient d'être envoyée aux importateurs de vins sur les marchés que vous avez sélectionnés.</p>
          <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#1a1a1a;">Vous recevrez un rapport détaillé dès que les résultats seront disponibles (ouvertures, clics, réponses et prospects qualifiés).</p>
          <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#1a1a1a;">Les prospects qualifiés et les réponses apparaîtront directement dans votre tableau de bord WineExporters dès qu'ils seront disponibles.</p>
          <div style="height:1px;background-color:#e5e5e5;margin:24px 0;"></div>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#555555;">Best regards / Cordialement,<br/><strong style="color:#1a1a1a;">Simon Lemonnier</strong><br/><span style="font-size:12px;">WineExporters by ExportVins</span></p>
        </td></tr>
        <tr><td align="center" style="padding-top:24px;">
          <p style="margin:0;font-size:12px;color:#666666;">Powered by <a href="https://wine-exporters.com" style="color:#59191F;text-decoration:none;font-weight:600;">WineExporters by ExportVins</a> — wine-exporters.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

  if (!ANTHROPIC_API_KEY) return json(500, { error: "ANTHROPIC_API_KEY not configured" });
  if (!BREVO_API_KEY) return json(500, { error: "BREVO_API_KEY not configured" });
  if (!RESEND_API_KEY) return json(500, { error: "RESEND_API_KEY not configured" });

  // Auth
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "Missing token" });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return json(401, { error: "Invalid token" });
  const callerId = userData.user.id;

  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: callerId, _role: "admin" });
  if (!isAdmin) return json(403, { error: "Forbidden" });

  let body: any;
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }
  const campaignId: string | undefined = body?.campaignId;
  if (!campaignId) return json(400, { error: "campaignId is required" });

  const markAsError = async () => {
    try {
      await admin.from("campaigns").update({ status: "error" }).eq("id", campaignId);
    } catch (e) {
      console.error("markAsError failed:", e);
    }
  };

  let step = "fetch_campaign";
  try {
    // Step 1 — Fetch
    const { data: campaign, error: cErr } = await admin
      .from("campaigns").select("*").eq("id", campaignId).maybeSingle();
    if (cErr || !campaign) throw new Error(`Campaign not found: ${cErr?.message}`);

    step = "fetch_profile";
    const { data: profile, error: pErr } = await admin
      .from("profiles").select("*").eq("user_id", campaign.user_id).maybeSingle();
    if (pErr) throw new Error(`Profile fetch failed: ${pErr.message}`);

    step = "fetch_user_email";
    const { data: authUser, error: aErr } = await admin.auth.admin.getUserById(campaign.user_id);
    if (aErr || !authUser?.user?.email) throw new Error(`User email not found: ${aErr?.message}`);
    const userEmail = authUser.user.email;

    step = "fetch_wines";
    const selectedIds: string[] = Array.isArray(campaign.selected_wines) ? campaign.selected_wines : [];
    let wines: any[] = [];
    if (selectedIds.length > 0) {
      const { data: wRows, error: wErr } = await admin
        .from("wines").select("id,name,color,appellation,exw_price_eur,awards")
        .in("id", selectedIds);
      if (wErr) throw new Error(`Wines fetch failed: ${wErr.message}`);
      wines = wRows ?? [];
    } else {
      // Fallback: all active wines of the producer
      const { data: wRows } = await admin
        .from("wines").select("id,name,color,appellation,exw_price_eur,awards")
        .eq("user_id", campaign.user_id).eq("is_active", true);
      wines = wRows ?? [];
    }

    // Step 2 — Anthropic
    step = "anthropic";
    const interestUrl = `https://wine-exporters.com/interest/${campaignId}`;
    const userMessage = buildAnthropicUserMessage({ campaignId, campaign, profile, wines, interestUrl });

    const anthResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    if (!anthResp.ok) {
      const t = await anthResp.text();
      throw new Error(`Anthropic ${anthResp.status}: ${t.slice(0, 500)}`);
    }
    const anthJson = await anthResp.json();
    const htmlContent: string = anthJson?.content?.[0]?.text ?? "";
    if (!htmlContent.trim().toLowerCase().startsWith("<!doctype") && !htmlContent.includes("<html")) {
      throw new Error("Anthropic returned no HTML content");
    }
    const subject = extractSubject(htmlContent, campaign.name);

    // Step 3 — Brevo
    step = "brevo_map_markets";
    const rawMarkets: string[] = (campaign.target_markets?.length ? campaign.target_markets : campaign.markets) ?? [];
    const listIds: number[] = [];
    const unmatched: string[] = [];
    for (const m of rawMarkets) {
      const key = normalizeCountry(m);
      const id = BREVO_LIST_IDS[key];
      if (id) { if (!listIds.includes(id)) listIds.push(id); }
      else unmatched.push(m);
    }
    if (unmatched.length) console.warn("Unmatched Brevo markets:", unmatched);
    if (listIds.length === 0) throw new Error("No Brevo lists matched target_markets");

    step = "brevo_create";
    const createResp = await fetch("https://api.brevo.com/v3/emailCampaigns", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        name: campaign.name,
        subject,
        sender: { name: "WineExporters", email: "simon@exportvins.fr" },
        recipients: { listIds },
        htmlContent,
      }),
    });
    if (!createResp.ok) {
      const t = await createResp.text();
      throw new Error(`Brevo create ${createResp.status}: ${t.slice(0, 500)}`);
    }
    const createJson = await createResp.json();
    const brevoId = createJson?.id;
    if (!brevoId) throw new Error("Brevo did not return campaign id");

    step = "brevo_send";
    const sendResp = await fetch(`https://api.brevo.com/v3/emailCampaigns/${brevoId}/sendNow`, {
      method: "POST",
      headers: { "api-key": BREVO_API_KEY, accept: "application/json" },
    });
    if (!sendResp.ok && sendResp.status !== 204) {
      const t = await sendResp.text();
      throw new Error(`Brevo sendNow ${sendResp.status}: ${t.slice(0, 500)}`);
    }

    // Step 4 — Update campaign status
    step = "update_campaign";
    const { error: uErr } = await admin.from("campaigns")
      .update({ status: "active", validated_at: new Date().toISOString(), admin_reviewer: callerId, launched_at: new Date().toISOString(), brevo_campaign_id: brevoId })
      .eq("id", campaignId);
    if (uErr) throw new Error(`Update campaign failed: ${uErr.message}`);

    // Step 5 — Notify user via Resend (best-effort)
    step = "resend_notify";
    try {
      const ownerHtml = buildOwnerEmailHtml(campaign.name, rawMarkets);
      const rResp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "WineExporters <simon@exportvins.fr>",
          to: [userEmail],
          cc: ["simon@exportvins.fr"],
          reply_to: "simon@exportvins.fr",
          subject: `Your campaign is live — ${campaign.name} / Votre campagne est en ligne`,
          html: ownerHtml,
        }),
      });
      if (!rResp.ok) {
        const t = await rResp.text();
        console.error(`Resend notify failed ${rResp.status}: ${t.slice(0, 500)}`);
      }
    } catch (e) {
      console.error("Resend notify exception:", e);
    }

    return json(200, { success: true, brevoCampaignId: brevoId, subject, listIds, unmatched });
  } catch (err: any) {
    console.error(`create-campaign failed at step=${step}:`, err?.message ?? err);
    await markAsError();
    return json(500, { error: err?.message ?? String(err), step });
  }
});
