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
}): Promise<{ description: string; recommended_actions: string }> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  const fallbackActions = input.interests
    .map((s) => `• ${INTEREST_LABELS[s] ?? s}`)
    .join("\n");
  const fallback = {
    description: `${input.full_name}${input.company ? ` from ${input.company}` : ""}${input.country ? ` (${input.country})` : ""} submitted the public interest form for campaign "${input.campaign_name}".`,
    recommended_actions: fallbackActions || "• Follow up with the prospect",
  };
  if (!key) return fallback;

  try {
    const prompt = `You enrich a CRM record for a wine producer named "${input.producer_name}".
A qualified buyer just submitted an interest form for the campaign "${input.campaign_name}".

Buyer details:
- Full name: ${input.full_name}
- Email: ${input.email}
- Company: ${input.company ?? "n/a"}
- Country: ${input.country ?? "n/a"}
- Phone: ${input.phone ?? "n/a"}
- Interests requested: ${input.interests.map((s) => INTEREST_LABELS[s] ?? s).join(", ") || "none specified"}

Return STRICT JSON with two keys only:
{
  "description": "1-2 short sentences in ENGLISH summarizing who the prospect is and what they are looking for. Neutral, professional tone. No greeting.",
  "recommended_actions": "A short bulleted list (use '• ' as bullet) in ENGLISH with 2-4 concrete next actions the producer should take, tailored to the interests requested."
}
No prose, no code fences.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You output only valid JSON. No commentary." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      console.error("AI gateway error", resp.status, await resp.text().catch(() => ""));
      return fallback;
    }
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return fallback;
    const parsed = JSON.parse(content);
    return {
      description:
        typeof parsed?.description === "string" && parsed.description.trim()
          ? parsed.description.trim().slice(0, 2000)
          : fallback.description,
      recommended_actions:
        typeof parsed?.recommended_actions === "string" && parsed.recommended_actions.trim()
          ? parsed.recommended_actions.trim().slice(0, 2000)
          : fallback.recommended_actions,
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

  return json(200, { ok: true });
});
