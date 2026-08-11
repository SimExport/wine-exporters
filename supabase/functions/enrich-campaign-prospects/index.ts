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

function clampScore(score: number, origin: string): number {
  const min = origin === "click" ? 4 : 6;
  const max = origin === "click" ? 7 : 10;
  return Math.min(max, Math.max(min, Math.round(score)));
}

async function askClaude(prompt: string): Promise<any | null> {
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
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
        system:
          "You output only valid JSON. No commentary, no code fences. All human-readable text fields must be written in French.",
      }),
    });
    if (!resp.ok) {
      console.error("Anthropic error", resp.status, await resp.text().catch(() => ""));
      return null;
    }
    const data = await resp.json();
    const raw = data?.content?.[0]?.text;
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

  let enriched = 0;
  const failed: string[] = [];

  for (const row of todo) {
    const origin = row.origin === "click" ? "click" : "form";
    const email = row.email ?? "";
    const domain = email.split("@")[1] ?? "";

    const prompt =
      origin === "click"
        ? `You enrich a CRM record for a wine producer named "${producer_name}".
Producer profile: ${JSON.stringify(producer_profile)}
A wine importer / distributor clicked on a link in the campaign email "${campaign.name}" but did NOT fill the interest form. Only the email address is known.

Buyer email: ${email}
Domain: ${domain}

Return STRICT JSON with five keys only:
{
  "description": "2-3 phrases EN FRANÇAIS déduisant la société probable à partir du domaine de l'email (type d'activité, adéquation probable avec le producteur). Ton neutre et professionnel. Si le domaine est générique (gmail, yahoo, hotmail, outlook…), indiquer que la société ne peut pas être déduite. Pas de formule de politesse.",
  "company_name": "Nom probable de la société déduit du domaine (ex: 'globalfw.com.au' -> 'Global Fine Wines'). Chaîne vide \"\" si le domaine est générique ou si le nom ne peut pas être déduit. Ne jamais utiliser la partie avant le @.",
  "country": "Pays probable de la société en anglais (ex: 'Australia'). Déduire du TLD ou de la marque. Chaîne vide \"\" si indéterminable.",
  "recommended_actions": "Une courte liste à puces (utiliser '• ') EN FRANÇAIS avec 2 à 4 actions concrètes et PRUDENTES à mener par le producteur. Le contact a seulement cliqué : privilégier un mail court de qualification, la vérification du positionnement/type d'activité, et n'envoyer échantillons ou tarifs qu'après réponse. Si la société est un grand groupe de distribution ou une adresse non pertinente, le dire et recommander de l'exclure.",
  "score": "Integer 4-7 on a /10 scale. Clicking is a passive signal. 4 for generic free email, 5 standard, 6 plausible professional domain, 7 clear pro wine-import domain matching the producer profile."
}
No prose, no code fences.`
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
  "description": "2-3 phrases EN FRANÇAIS décrivant la société du prospect (type d'activité, adéquation probable avec le producteur). Ton neutre et professionnel, sans formule de politesse.",
  "recommended_actions": "Une courte liste à puces (utiliser '• ') EN FRANÇAIS avec 2 à 4 actions concrètes à mener par le producteur.",
  "score": "Integer 6-10 on a /10 scale. Floor is 6 because the form submission signals strong intent."
}
No prose, no code fences.`;

    const parsed = await askClaude(prompt);

    const fallbackDescription =
      origin === "click"
        ? `A cliqué dans l'email de la campagne « ${campaign.name} » sans remplir le formulaire d'intérêt. Domaine : ${domain || "inconnu"}.`
        : `${row.contact_name ?? row.company_name ?? "Ce contact"} a rempli le formulaire d'intérêt de la campagne « ${campaign.name} ».`;

    const description =
      typeof parsed?.description === "string" && parsed.description.trim()
        ? parsed.description.trim().slice(0, 2000)
        : fallbackDescription;

    const parsedScore = Number(parsed?.score);
    const score = clampScore(
      Number.isFinite(parsedScore) ? parsedScore : (row.score ?? (origin === "click" ? 5 : 7)),
      origin,
    );

    const update: Record<string, unknown> = { description, score, origin };

    if (origin === "click") {
      const localPart = (email.split("@")[0] ?? "").toLowerCase();
      const currentCompany = String(row.company_name ?? "").trim();
      const suggestedCompany =
        typeof parsed?.company_name === "string" ? parsed.company_name.trim() : "";
      const companyIsBogus =
        currentCompany === "" || currentCompany.toLowerCase() === localPart;
      if (suggestedCompany && (force || companyIsBogus)) {
        update.company_name = suggestedCompany.slice(0, 120);
      }

      const currentCountry = String(row.country ?? "").trim();
      const suggestedCountry =
        typeof parsed?.country === "string" ? parsed.country.trim() : "";
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
  }

  return json(200, {
    ok: true,
    total: (rows ?? []).length,
    candidates: todo.length,
    enriched,
    failed: failed.length,
  });
});