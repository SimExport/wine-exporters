// Enrich campaign qualified prospects (form respondents and clickers) that have
// no AI description yet. Admin only. Body: { campaign_id: string }
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clampScore(score: number, origin: string, matched = false): number {
  const min = origin === "click" ? (matched ? 5 : 4) : 6;
  const max = origin === "click" ? (matched ? 8 : 7) : 10;
  return Math.min(max, Math.max(min, Math.round(score)));
}

// Claude returns inline citation markup when web_search is used.
function stripCitations(text: string): string {
  return text
    .replace(/<\/?cite[^>]*>/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

import { findBuyerContact } from "../_shared/buyer-match.ts";

async function askClaude(prompt: string, useWebSearch = false): Promise<any | null> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return null;
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
        ...(useWebSearch
          ? {
              tools: [
                { type: "web_search_20250305", name: "web_search", max_uses: 3 },
              ],
            }
          : {}),
        system:
          "You output only valid JSON. No commentary, no code fences. All human-readable text fields must be written in French, in an assertive, directive tone. Never use hedging words (probable, probablement, vraisemblablement, semble, paraît, pourrait, peut-être, suggère, il est possible que, a priori, sans doute).",
      }),
    });
    if (!resp.ok) {
      console.error("Anthropic error", resp.status, await resp.text().catch(() => ""));
      return null;
    }
    const data = await resp.json();
    const textBlocks = Array.isArray(data?.content)
      ? data.content.filter((b: any) => b?.type === "text" && typeof b?.text === "string")
      : [];
    const raw = textBlocks.length ? textBlocks[textBlocks.length - 1].text : undefined;
    if (typeof raw !== "string") return null;
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Claude call failed:", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });
  const jwt = authHeader.replace("Bearer ", "");

  const authClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: claims, error: claimsErr } = await authClient.auth.getClaims(jwt);
  if (claimsErr || !claims?.claims?.sub) return json(401, { error: "Unauthorized" });
  const userId = claims.claims.sub as string;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleErr || !isAdmin) return json(403, { error: "Forbidden" });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }
  const campaign_id = typeof body?.campaign_id === "string" ? body.campaign_id : null;
  if (!campaign_id) return json(400, { error: "Missing campaign_id" });
  const force = body?.force === true;
  const limit = Number.isFinite(Number(body?.limit))
    ? Math.min(20, Math.max(1, Math.round(Number(body.limit))))
    : 5;
  const offset = Number.isFinite(Number(body?.offset))
    ? Math.max(0, Math.round(Number(body.offset)))
    : 0;

  const { data: campaign, error: campErr } = await admin
    .from("campaigns")
    .select("id, name, user_id, target_markets")
    .eq("id", campaign_id)
    .maybeSingle();
  if (campErr || !campaign) return json(404, { error: "Campaign not found" });
  const defaultMarket =
    (Array.isArray((campaign as any).target_markets) && (campaign as any).target_markets[0]) ||
    null;

  let producer_profile: Record<string, unknown> = {};
  if (campaign.user_id) {
    const { data: profile } = await admin
      .from("profiles")
      .select("domain_name, aoc, location, description, strengths, target_buyer_description")
      .eq("user_id", campaign.user_id)
      .maybeSingle();
    if (profile) producer_profile = profile as Record<string, unknown>;
  }
  const producer_name =
    (producer_profile?.domain_name as string) || campaign.name || "the producer";

  const { data: rows, error: rowsErr } = await admin
    .from("campaign_interested_contacts")
    .select(
      "id, company_name, contact_name, email, country, score, description, recommended_actions, origin",
    )
    .eq("campaign_id", campaign_id);
  if (rowsErr) return json(500, { error: rowsErr.message });

  const todo = force
    ? (rows ?? [])
    : (rows ?? []).filter((r: any) => !r.description || String(r.description).trim() === "");

  const batch = todo.slice(offset, offset + limit);
  const startedAt = Date.now();
  const TIME_BUDGET_MS = 60_000;

  let enriched = 0;
  const failed: string[] = [];
  let processed = 0;
  let stoppedEarly = false;

  const processRow = async (row: any) => {
    const origin = row.origin === "click" ? "click" : "form";
    const email = row.email ?? "";
    const domain = email.split("@")[1] ?? "";

    const matched =
      origin === "click" && email
        ? await findBuyerContact(admin, email, row.company_name ?? null)
        : null;

    const clickMatchedPrompt = `You enrich a CRM record for a wine producer named "${producer_name}".
Producer profile: ${JSON.stringify(producer_profile)}
A wine importer / distributor clicked on a link in the campaign email "${campaign.name}" but did NOT fill the interest form.
This contact has been matched with a verified record in our own importer database. Use ONLY these factual data, do not invent anything and do NOT search the web.

Buyer email: ${email}
Verified record: ${JSON.stringify(matched ?? {})}

Return STRICT JSON with five keys only:
{
  "description": "2-3 phrases EN FRANÇAIS décrivant la société à partir des données vérifiées ci-dessus (activité, localisation, présence en ligne, adéquation avec le producteur). Ton affirmatif et professionnel, au présent de l'indicatif. Pas de formule de politesse.",
  "company_name": "Nom exact de la société tel qu'il figure dans la fiche vérifiée.",
  "country": "Pays de la société en anglais, tel qu'il figure dans la fiche vérifiée (ou déduit de l'adresse). Chaîne vide \\"\\" si absent.",
  "recommended_actions": "Une courte liste à puces (utiliser '• ') EN FRANÇAIS avec 2 à 4 actions concrètes, chacune commençant par un verbe à l'infinitif directif (Envoyer, Vérifier, Proposer, Appeler…), en exploitant les coordonnées disponibles (téléphone, site, réseaux).",
  "score": "Integer 5-8 on a /10 scale. Base 5 because the contact is verified in our database, +1 to +3 depending on how well the company fits the producer profile (type d'activité, marché, gamme)."
}
No prose, no code fences.

STYLE OBLIGATOIRE : écrire de façon directive et assurée. Interdiction absolue d'employer « probable », « probablement », « vraisemblablement », « semble », « paraît », « pourrait », « peut-être », « suggère », « il est possible que », « a priori », « sans doute », ou toute autre marque d'hésitation. Affirmer au présent.`;

    const clickWebPrompt = `You enrich a CRM record for a wine producer named "${producer_name}".
Producer profile: ${JSON.stringify(producer_profile)}
A wine importer / distributor clicked on a link in the campaign email "${campaign.name}" but did NOT fill the interest form. Only the email address is known.
Use the web_search tool (max 3 searches) on the email domain to identify the company before writing.

Buyer email: ${email}
Domain: ${domain}

Return STRICT JSON with five keys only:
{
  "description": "2-3 phrases EN FRANÇAIS identifiant la société à partir du domaine de l'email (type d'activité, adéquation avec le producteur). Ton affirmatif et professionnel, au présent de l'indicatif. Si le domaine est générique (gmail, yahoo, hotmail, outlook…), écrire une phrase factuelle et nette : « La société n'est pas identifiable depuis cette adresse. ». Pas de formule de politesse.",
  "company_name": "Nom de la société déduit du domaine (ex: 'globalfw.com.au' -> 'Global Fine Wines'). Chaîne vide \"\" si le domaine est générique ou si le nom ne peut pas être déduit. Ne jamais utiliser la partie avant le @.",
  "country": "Pays de la société en anglais (ex: 'Australia'), déduit du TLD ou de la marque. Chaîne vide \"\" si indéterminable.",
  "recommended_actions": "Une courte liste à puces (utiliser '• ') EN FRANÇAIS avec 2 à 4 actions concrètes à mener par le producteur, chacune commençant par un verbe à l'infinitif directif (Envoyer, Vérifier, Proposer, Exclure…). Le contact a seulement cliqué : commencer par un mail court de qualification, vérifier le positionnement et le type d'activité, et n'envoyer échantillons ou tarifs qu'après réponse. Si la société est un grand groupe de distribution ou une adresse non pertinente, l'affirmer et recommander de l'exclure.",
  "score": "Integer 4-7 on a /10 scale. Clicking is a passive signal. 4 for generic free email, 5 standard, 6 plausible professional domain, 7 clear pro wine-import domain matching the producer profile."
}
No prose, no code fences.

STYLE OBLIGATOIRE : écrire de façon directive et assurée. Interdiction absolue d'employer « probable », « probablement », « vraisemblablement », « semble », « paraît », « pourrait », « peut-être », « suggère », « il est possible que », « a priori », « sans doute », ou toute autre marque d'hésitation. Affirmer au présent. Une information manquante s'énonce de manière factuelle et nette, jamais par une hypothèse floue.`;

    const prompt =
      origin === "click"
        ? matched
          ? clickMatchedPrompt
          : clickWebPrompt
        : `You enrich a CRM record for a wine producer named "${producer_name}".
Producer profile: ${JSON.stringify(producer_profile)}
A qualified buyer submitted an interest form for the campaign "${campaign.name}".

Buyer details:
- Company: ${row.company_name ?? "n/a"}
- Contact: ${row.contact_name ?? "n/a"}
- Email: ${email || "n/a"}
- Country: ${row.country ?? "n/a"}

Return STRICT JSON with three keys only:
{
  "description": "2-3 phrases EN FRANÇAIS décrivant la société du prospect (type d'activité, adéquation avec le producteur). Ton affirmatif et professionnel, au présent de l'indicatif, sans formule de politesse.",
  "recommended_actions": "Une courte liste à puces (utiliser '• ') EN FRANÇAIS avec 2 à 4 actions concrètes à mener par le producteur, chacune commençant par un verbe à l'infinitif directif (Envoyer, Vérifier, Proposer…).",
  "score": "Integer 6-10 on a /10 scale. Floor is 6 because the form submission signals strong intent."
}
No prose, no code fences.

STYLE OBLIGATOIRE : écrire de façon directive et assurée. Interdiction absolue d'employer « probable », « probablement », « vraisemblablement », « semble », « paraît », « pourrait », « peut-être », « suggère », « il est possible que », « a priori », « sans doute », ou toute autre marque d'hésitation. Affirmer au présent.`;

    const parsed = await askClaude(prompt, origin === "click" && !matched);
    console.log(
      `enriched contact ${row.id} <${email || "no-email"}> origin=${origin} source=${
        origin === "click" ? (matched ? "buyer_contacts" : "web_search") : "form"
      } ai=${parsed ? "ok" : "fallback"}`,
    );

    const fallbackDescription =
      origin === "click"
        ? `Ce contact a cliqué dans l'email de la campagne « ${campaign.name} » sans remplir le formulaire d'intérêt. Domaine : ${domain || "non renseigné"}.`
        : `${row.contact_name ?? row.company_name ?? "Ce contact"} a rempli le formulaire d'intérêt de la campagne « ${campaign.name} ».`;

    const description =
      typeof parsed?.description === "string" && parsed.description.trim()
        ? parsed.description.trim().slice(0, 2000)
        : fallbackDescription;

    const parsedScore = Number(parsed?.score);
    const score = clampScore(
      Number.isFinite(parsedScore) ? parsedScore : (row.score ?? (origin === "click" ? 5 : 7)),
      origin,
      !!matched,
    );

    const update: Record<string, unknown> = { description, score, origin };

    if (origin === "click") {
      const localPart = (email.split("@")[0] ?? "").toLowerCase();
      const currentCompany = String(row.company_name ?? "").trim();
      const suggestedCompany =
        (matched?.company_name ?? "").trim() ||
        (typeof parsed?.company_name === "string" ? parsed.company_name.trim() : "");
      const companyIsBogus =
        currentCompany === "" || currentCompany.toLowerCase() === localPart;
      if (suggestedCompany && (force || companyIsBogus)) {
        update.company_name = suggestedCompany.slice(0, 120);
      }

      const currentCountry = String(row.country ?? "").trim();
      const suggestedCountry =
        (matched?.country ?? "").trim() ||
        (typeof parsed?.country === "string" ? parsed.country.trim() : "");
      const countryIsDefault =
        currentCountry === "" ||
        (!!defaultMarket &&
          currentCountry.toLowerCase() === String(defaultMarket).toLowerCase());
      if (
        suggestedCountry &&
        suggestedCountry.toLowerCase() !== currentCountry.toLowerCase() &&
        (force || countryIsDefault)
      ) {
        update.country = suggestedCountry.slice(0, 80);
      }
    }

    const suggestedActions =
      typeof parsed?.recommended_actions === "string" ? parsed.recommended_actions.trim() : "";
    if (suggestedActions) {
      update.recommended_actions = suggestedActions.slice(0, 2000);
    } else if (origin === "click" && !String(row.recommended_actions ?? "").trim()) {
      update.recommended_actions = `• Envoyer un mail court de qualification pour confirmer l'activité et le positionnement.\n• Vérifier le site web et le portefeuille avant tout envoi.\n• N'adresser tarifs et échantillons qu'après une réponse positive.`;
    }

    const { error: updErr } = await admin
      .from("campaign_interested_contacts")
      .update(update)
      .eq("id", row.id);
    if (updErr) {
      console.error("Enrichment update failed:", row.id, updErr.message);
      failed.push(row.id);
    } else enriched++;
  };

  for (let i = 0; i < batch.length; i += 3) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      stoppedEarly = true;
      break;
    }
    const slice = batch.slice(i, i + 3);
    await Promise.all(
      slice.map(async (row: any) => {
        try {
          await processRow(row);
        } catch (e) {
          console.error("Enrichment failed for", row.id, e);
          failed.push(row.id);
        }
      }),
    );
    processed += slice.length;
  }

  // When not forcing, enriched rows drop out of the `todo` filter on the next
  // call, so paging always restarts at 0. When forcing, page forward.
  const remaining = Math.max(0, todo.length - offset - processed);
  const next_offset = force ? offset + processed : 0;

  return json(200, {
    ok: true,
    total: (rows ?? []).length,
    candidates: todo.length,
    enriched,
    failed: failed.length,
    processed,
    remaining,
    next_offset,
    stopped_early: stoppedEarly,
  });
});