import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveCountryVariants } from "./country-variants.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function callAnthropic(systemPrompt: string, userPrompt: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Anthropic ${res.status}: ${txt}`);
  }
  const data = await res.json();
  const text = data?.content?.[0]?.text ?? "";
  return text as string;
}

function extractJson(text: string): any {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fence ? fence[1] : text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in LLM response");
  return JSON.parse(raw.slice(start, end + 1));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let sourcing_request_id: string | undefined;
  try {
    const body = await req.json();
    sourcing_request_id = body?.sourcing_request_id;
  } catch (_) {}
  if (!sourcing_request_id) return json({ error: "sourcing_request_id required" }, 400);

  // Load request
  const { data: reqRow, error: reqErr } = await supabase
    .from("sourcing_requests")
    .select("*")
    .eq("id", sourcing_request_id)
    .maybeSingle();
  if (reqErr || !reqRow) return json({ error: "request not found" }, 404);

  // Idempotency: if in_progress < 5min, refuse
  if (reqRow.status === "in_progress" && reqRow.processing_started_at) {
    const started = new Date(reqRow.processing_started_at).getTime();
    if (Date.now() - started < 5 * 60 * 1000) {
      return json({ error: "already processing" }, 409);
    }
  }

  const userId: string = reqRow.user_id;

  // Check credit
  const { data: credits } = await supabase
    .from("user_credits")
    .select("search_credits")
    .eq("user_id", userId)
    .maybeSingle();
  if (!credits || (credits.search_credits ?? 0) < 1) {
    await supabase.from("sourcing_requests").update({
      error_message: "Crédit de recherche insuffisant",
    }).eq("id", sourcing_request_id);
    return json({ error: "no_credits" }, 402);
  }

  // Decrement credit + mark in_progress
  await supabase.from("user_credits")
    .update({ search_credits: credits.search_credits - 1, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  await supabase.from("sourcing_requests").update({
    status: "in_progress",
    processing_started_at: new Date().toISOString(),
    error_message: null,
  }).eq("id", sourcing_request_id);

  const refundCredit = async () => {
    await supabase.from("user_credits")
      .update({ search_credits: credits.search_credits, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
  };

  try {
    // Load profile + wines
    const [{ data: profile }, { data: wines }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("wines").select("name, color, appellation, grapes, exw_price_eur, organic, is_biodynamic, is_natural, vintages, description").eq("user_id", userId).eq("is_active", true),
    ]);

    // target_market is a country name picked directly from buyer_contacts (already consistent).
    // We still resolve all DB variants (trailing spaces, case) for the same trimmed/lowercased name.
    const marketName: string = reqRow.target_market;
    const marketKey = marketName.trim().toLowerCase();

    const { data: allCountries, error: cListErr } = await supabase
      .from("buyer_contacts")
      .select("country")
      .not("country", "is", null);
    if (cListErr) throw cListErr;

    const variants = resolveCountryVariants(marketName, (allCountries ?? []) as { country: string | null }[]);

    let query = supabase
      .from("buyer_contacts")
      .select("id, country, state, company_name, email, phone, website_url, city, full_address, LinkedIn, Facebook, Instagram")
      .in("country", variants)
      .limit(500);

    if (reqRow.states_filter && reqRow.states_filter.length > 0) {
      query = query.in("state", reqRow.states_filter);
    }

    const { data: contacts, error: cErr } = await query;
    if (cErr) throw cErr;

    if (!contacts || contacts.length === 0) {
      throw new Error("Aucun contact disponible pour ce marché");
    }

    // Compact for LLM
    const compactContacts = contacts.map((c: any) => ({
      id: c.id,
      company: c.company_name,
      email: c.email,
      phone: c.phone,
      website: c.website_url,
      city: c.city,
      state: c.state,
      country: c.country,
    }));

    const profileSummary = {
      domain: profile?.domain_name,
      location: profile?.location,
      aoc: profile?.aoc,
      wine_types: profile?.wine_types,
      wine_colors: profile?.wine_colors,
      certifications: profile?.certifications,
      grape_varieties: profile?.grape_varieties,
      description: profile?.description,
      target_buyer_description: profile?.target_buyer_description,
      priority_markets: profile?.priority_markets,
      strengths: profile?.strengths,
      bottles_per_year: profile?.bottles_per_year,
    };

    const systemPrompt = `Tu es un expert en commerce international du vin pour WineExporters. Ta mission : analyser une base d'importateurs/distributeurs et sélectionner les 10 à 20 contacts les plus pertinents pour un domaine viticole français donné.

Tu dois répondre UNIQUEMENT avec un JSON valide (sans markdown autour) au format strict suivant :
{
  "shortlist": [
    {
      "company_name": "string",
      "email": "string|null",
      "phone": "string|null",
      "website_url": "string|null",
      "score": 1-10,
      "reason": "explication en français du match (1-2 phrases)"
    }
  ],
  "summary_markdown": "synthèse markdown de l'analyse (positionnement, recommandations, points d'attention) en français, 3-6 paragraphes"
}

Critères de scoring : pertinence du portefeuille produit, complétude des informations de contact, taille présumée et zone géographique pertinente.`;

    const userPrompt = `## Profil du domaine\n${JSON.stringify(profileSummary, null, 2)}\n\n## Cuvées du domaine\n${JSON.stringify(wines ?? [], null, 2)}\n\n## Contacts disponibles (${compactContacts.length})\n${JSON.stringify(compactContacts, null, 2)}\n\nRetourne le JSON demandé.`;

    const llmText = await callAnthropic(systemPrompt, userPrompt);
    const parsed = extractJson(llmText);

    if (!Array.isArray(parsed?.shortlist)) {
      throw new Error("LLM response missing shortlist");
    }

    const summary = String(parsed.summary_markdown ?? "");
    const now = new Date().toISOString();
    await supabase.from("sourcing_requests").update({
      status: "validated",
      result_json: parsed,
      result_summary: summary,
      processing_completed_at: now,
      validated_at: now,
    }).eq("id", sourcing_request_id);

    // Resend email (best-effort)
    if (RESEND_API_KEY) {
      try {
        const { data: userInfo } = await supabase.auth.admin.getUserById(userId);
        const toEmail = userInfo?.user?.email;
        if (toEmail) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "WineExporters <notifications@wine-exporters.com>",
              to: [toEmail],
              subject: "Votre recherche sur-mesure est prête",
              html: `<p>Bonjour,</p><p>Votre recherche sur-mesure pour le marché <strong>${marketName}</strong> est terminée.</p><p>Connectez-vous à votre espace WineExporters pour consulter la shortlist générée.</p><p><a href="https://wine-exporters.com/recherches">Voir les résultats</a></p>`,
            }),
          });
        }
      } catch (e) {
        console.error("Resend error", e);
      }
    }

    return json({ ok: true, shortlist_count: parsed.shortlist.length });
  } catch (err: any) {
    console.error("process-sourcing-request error", err);
    await refundCredit();
    await supabase.from("sourcing_requests").update({
      status: "pending",
      error_message: String(err?.message ?? err),
      processing_started_at: null,
    }).eq("id", sourcing_request_id);
    return json({ error: String(err?.message ?? err) }, 500);
  }
});