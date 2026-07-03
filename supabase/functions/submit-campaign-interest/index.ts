import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_INTERESTS = [
  "samples",
  "price_list",
  "presentation",
  "technical_sheets",
  "visio_call",
  "phone_call",
] as const;

const INTEREST_LABELS: Record<string, string> = {
  samples: "Send samples",
  price_list: "Send price list",
  presentation: "Send presentation deck",
  technical_sheets: "Send technical sheets",
  visio_call: "Schedule a video call",
  phone_call: "Schedule a phone call",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clean(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

async function enrichWithAI(input: {
  full_name: string;
  email: string;
  company: string | null;
  country: string | null;
  phone: string | null;
  interests: string[];
  producer_name: string;
  campaign_name: string;
  producer_profile: Record<string, unknown>;
}): Promise<{ description: string; recommended_actions: string; score: number }> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  const fallbackActions = input.interests
    .map((s) => `• ${INTEREST_LABELS[s] ?? s}`)
    .join("\n");
  const fallback = {
    description: `${input.full_name}${input.company ? ` from ${input.company}` : ""}${input.country ? ` (${input.country})` : ""} submitted the public interest form for campaign "${input.campaign_name}".`,
    recommended_actions: fallbackActions || "• Follow up with the prospect",
    score: 3,
  };
  if (!key) return fallback;

  try {
    const prompt = `You enrich a CRM record for a wine producer named "${input.producer_name}".
Producer profile: ${JSON.stringify(input.producer_profile)}
A qualified buyer just submitted an interest form for the campaign "${input.campaign_name}".

Buyer details:
- Full name: ${input.full_name}
- Email: ${input.email}
- Company: ${input.company ?? "n/a"}
- Country: ${input.country ?? "n/a"}
- Phone: ${input.phone ?? "n/a"}
- Interests requested: ${input.interests.map((s) => INTEREST_LABELS[s] ?? s).join(", ") || "none specified"}

Return STRICT JSON with three keys only:
{
  "description": "2-3 sentences in ENGLISH describing the prospect company (business type, likely market fit with the producer). Neutral, professional tone. No greeting.",
  "recommended_actions": "A short bulleted list (use '• ' as bullet) in ENGLISH with 2-4 concrete next actions the producer should take, tailored to the interests requested.",
  "score": "Integer 1-5 qualifying the lead (1=cold, 5=hot) based on completeness of the submission and fit with the producer profile."
}
No prose, no code fences.`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1000,
        messages: [
          { role: "user", content: prompt },
        ],
        system: "You output only valid JSON. No commentary, no code fences.",
      }),
    });

    if (!resp.ok) {
      console.error("Anthropic error", resp.status, await resp.text().catch(() => ""));
      return fallback;
    }
    const data = await resp.json();
    const rawContent = data?.content?.[0]?.text;
    if (typeof rawContent !== "string") return fallback;
    const cleaned = rawContent.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
    const parsed = JSON.parse(cleaned);
    const parsedScore = Number(parsed?.score);
    return {
      description:
        typeof parsed?.description === "string" && parsed.description.trim()
          ? parsed.description.trim().slice(0, 2000)
          : fallback.description,
      recommended_actions:
        typeof parsed?.recommended_actions === "string" && parsed.recommended_actions.trim()
          ? parsed.recommended_actions.trim().slice(0, 2000)
          : fallback.recommended_actions,
      score:
        Number.isFinite(parsedScore) && parsedScore >= 1 && parsedScore <= 5
          ? Math.round(parsedScore)
          : fallback.score,
    };
  } catch (e) {
    console.error("AI enrichment failed:", e);
    return fallback;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const campaign_id = clean(body?.campaign_id, 64);
  const full_name = clean(body?.full_name, 120);
  const emailRaw = clean(body?.email, 255);
  const company = clean(body?.company, 200);
  const country = clean(body?.country, 100);
  const phone = clean(body?.phone, 40);
  const interestsRaw = Array.isArray(body?.interests) ? body.interests : [];
  const interests = interestsRaw.filter(
    (s: unknown): s is string =>
      typeof s === "string" && (ALLOWED_INTERESTS as readonly string[]).includes(s),
  );

  if (!campaign_id || !full_name || !emailRaw) {
    return json(400, { error: "Missing required fields" });
  }
  const email = emailRaw.toLowerCase();
  if (!isEmail(email)) {
    return json(400, { error: "Invalid email" });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: campaignInfo, error: campErr } = await supabase.rpc(
    "get_campaign_public_info",
    { _campaign_id: campaign_id },
  );
  if (campErr || !campaignInfo || (Array.isArray(campaignInfo) && campaignInfo.length === 0)) {
    return json(404, { error: "Campaign not found" });
  }
  const info = Array.isArray(campaignInfo) ? campaignInfo[0] : campaignInfo;
  const producer_name: string = info?.producer_name ?? info?.campaign_name ?? "the producer";
  const campaign_name: string = info?.campaign_name ?? "";

  const enriched = await enrichWithAI({
    full_name,
    email,
    company,
    country,
    phone,
    interests,
    producer_name,
    campaign_name,
  });

  const { error: insertErr } = await supabase
    .from("campaign_interested_contacts")
    .insert({
      campaign_id,
      company_name: company || full_name,
      contact_name: full_name,
      email,
      country,
      phone,
      description: enriched.description,
      recommended_actions: enriched.recommended_actions,
      score: 5,
    });

  if (insertErr) {
    console.error("Insert failed:", insertErr);
    return json(500, { error: "Could not save your submission" });
  }

  // Fire-and-forget confirmation email to the prospect
  try {
    supabase.functions
      .invoke("send-interest-confirmation", {
        body: {
          email,
          full_name,
          producer_name,
          user_name: producer_name,
        },
      })
      .then(({ error }) => {
        if (error) console.error("Confirmation email invoke error:", error);
      });
  } catch (e) {
    console.error("Failed to enqueue confirmation email:", e);
  }

  return json(200, { ok: true });
});
