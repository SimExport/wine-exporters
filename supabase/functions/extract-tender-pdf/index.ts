import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SYSTEM_PROMPT = `You are an expert at reading wine, beer, and spirits tender documents (appels d'offres) from European monopolies such as Systembolaget (Sweden), Alko (Finland), Vinmonopolet (Norway), and similar buyers.

From the provided PDF, extract EVERY product reference / lot listed. Return a strict JSON object of the shape:
{
  "market": "<inferred market name and country, e.g. 'Systembolaget (Suède)'>",
  "references": [
    {
      "reference": "<lot or reference number, e.g. '657-190'>",
      "category": "<e.g. 'Vin rouge', 'Champagne', 'Bière', 'Spiritueux'>",
      "designation_origin": "<appellation, origin, designation>",
      "price": "<target / max price as written, e.g. 'Maximum 6,19 € EXW'>",
      "available_volume": "<requested volume, e.g. '9 000 unités'>",
      "vintage": "<vintage if any, else null>",
      "deadline_answer": "<YYYY-MM-DD or null>",
      "deadline_sample": "<YYYY-MM-DD or null>",
      "style_profile": "<short description of the expected wine/product profile>",
      "requirements": "<any specific requirements: labeling, packaging, photos, certificates, single-product-per-producer rules, etc.>"
    }
  ]
}

Rules:
- Keep the original language of the document for textual fields.
- Include every reference, including non-wine ones (beer, cider, spirits) — the admin will filter them.
- Dates MUST be ISO YYYY-MM-DD. If a field is missing, use null.
- Return ONLY the JSON, no prose, no markdown fences.`;

function extractJson(text: string): any {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fence ? fence[1] : text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found");
  return JSON.parse(raw.slice(start, end + 1));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    // Auth + admin check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "Invalid token" }, 401);
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    const pdfBase64: string | undefined = body?.pdf_base64;
    if (!pdfBase64) return json({ error: "Missing pdf_base64" }, 400);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
              },
              { type: "text", text: "Extract every reference from this tender PDF as JSON." },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Anthropic error", res.status, txt);
      return json({ error: `Anthropic ${res.status}`, detail: txt }, 502);
    }

    const data = await res.json();
    const text = data?.content?.[0]?.text ?? "";
    let parsed: any;
    try {
      parsed = extractJson(text);
    } catch (e) {
      console.error("JSON parse error", e, text);
      return json({ error: "Failed to parse model output", raw: text }, 502);
    }

    return json(parsed);
  } catch (e: any) {
    console.error("extract-tender-pdf error", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});