// Analyse de marché pour les prospects du formulaire public /market-analysis.
// Workflow entièrement séparé de process-sourcing-request (abonnés) : aucun
// crédit utilisateur n'est lu ni décrémenté ici.
import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveCountryVariants } from "../_shared/country-variants.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const MAX_CANDIDATES = 30;
const MAX_PAGES_PER_SITE = 3;
const MAX_TEXT_PER_COMPANY = 4000;
const FETCH_TIMEOUT_MS = 6000;
const WEBMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "hotmail.com",
  "hotmail.co.uk",
  "outlook.com",
  "live.com",
  "icloud.com",
  "aol.com",
  "gmx.de",
  "web.de",
  "orange.fr",
  "wanadoo.fr",
  "free.fr",
  "qq.com",
  "163.com",
]);

type Candidate = {
  buyer_contact_id: string;
  company_name: string;
  email: string;
  phone: string | null;
  website_url: string | null;
  city: string | null;
  country: string | null;
  website_text: string;
  _score: number;
};

function normalizeCompany(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  const raw = url.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch (_) {
    return null;
  }
}

function emailDomain(email: string | null): string | null {
  const d = String(email ?? "").split("@")[1];
  return d ? d.trim().toLowerCase() : null;
}

function technicalScore(row: any): number {
  let s = 0;
  const host = hostOf(row.website_url);
  if (host) s += 3;
  if (row.email) s += 2;
  if (row.phone) s += 1;
  if (row.city) s += 1;
  const dom = emailDomain(row.email);
  if (dom && !WEBMAIL_DOMAINS.has(dom)) s += 1;
  if (dom && host && (host.endsWith(dom) || dom.endsWith(host))) s += 1;
  return s;
}

/** Préfiltrage déterministe : nettoyage, déduplication, score technique interne. */
function preselect(rows: any[]): Candidate[] {
  const usable = (rows ?? []).filter(
    (r) => String(r?.company_name ?? "").trim() && String(r?.email ?? "").trim(),
  );

  const byKey = new Map<string, any>();
  for (const row of usable) {
    const host = hostOf(row.website_url);
    const dom = emailDomain(row.email);
    const key =
      host ??
      (dom && !WEBMAIL_DOMAINS.has(dom) ? dom : null) ??
      normalizeCompany(row.company_name);
    if (!key) continue;
    const existing = byKey.get(key);
    if (!existing || technicalScore(row) > technicalScore(existing)) {
      byKey.set(key, row);
    }
  }

  // Deuxième passe : doublons évidents sur le nom normalisé.
  const byName = new Map<string, any>();
  for (const row of byKey.values()) {
    const key = normalizeCompany(row.company_name);
    const existing = byName.get(key);
    if (!existing || technicalScore(row) > technicalScore(existing)) {
      byName.set(key, row);
    }
  }

  return Array.from(byName.values())
    .map((row) => ({
      buyer_contact_id: String(row.id),
      company_name: String(row.company_name).trim(),
      email: String(row.email).trim(),
      phone: row.phone ?? null,
      website_url: row.website_url ?? null,
      city: row.city ?? null,
      country: row.country ?? null,
      website_text: "",
      _score: technicalScore(row),
    }))
    .sort((a, b) => {
      const aSite = hostOf(a.website_url) ? 1 : 0;
      const bSite = hostOf(b.website_url) ? 1 : 0;
      if (aSite !== bSite) return bSite - aSite;
      return b._score - a._score;
    })
    .slice(0, MAX_CANDIDATES);
}

async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WineExporters/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return "";
    const type = res.headers.get("content-type") ?? "";
    if (type && !type.includes("html")) return "";
    return await res.text();
  } catch (_) {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ABOUT_HINTS = ["about", "company", "qui-sommes", "qui_sommes", "quienes", "chi-siamo", "ueber", "uber-uns", "over-ons", "om-os", "histoire", "story"];
const PORTFOLIO_HINTS = ["portfolio", "wines", "wine", "producers", "producer", "brands", "vins", "vini", "weine", "range", "products", "catalog"];

/** Liens internes de la homepage correspondant aux mots-clés donnés. */
function pickInternalLinks(html: string, baseUrl: string, hints: string[]): string[] {
  const out: string[] = [];
  const base = new URL(baseUrl);
  const re = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    let abs: URL;
    try {
      abs = new URL(href, base);
    } catch (_) {
      continue;
    }
    if (abs.hostname.replace(/^www\./, "") !== base.hostname.replace(/^www\./, "")) continue;
    const path = `${abs.pathname}`.toLowerCase();
    if (hints.some((h) => path.includes(h))) {
      const clean = `${abs.origin}${abs.pathname}`;
      if (!out.includes(clean)) out.push(clean);
    }
    if (out.length >= 3) break;
  }
  return out;
}

/** Enrichissement léger, sans IA et sans moteur de recherche externe. */
async function enrichCandidate(c: Candidate): Promise<void> {
  const host = hostOf(c.website_url);
  if (!host) return;
  const homeUrl = `https://${host}`;
  const home = await fetchPage(homeUrl);
  if (!home) return;

  const texts: string[] = [htmlToText(home)];
  const extra = [
    ...pickInternalLinks(home, homeUrl, ABOUT_HINTS).slice(0, 1),
    ...pickInternalLinks(home, homeUrl, PORTFOLIO_HINTS).slice(0, 1),
  ].slice(0, MAX_PAGES_PER_SITE - 1);

  for (const url of extra) {
    const html = await fetchPage(url);
    if (html) texts.push(htmlToText(html));
  }

  c.website_text = texts.join("\n\n").slice(0, MAX_TEXT_PER_COMPANY);
}

async function enrichAll(candidates: Candidate[]): Promise<void> {
  const BATCH = 5;
  for (let i = 0; i < candidates.length; i += BATCH) {
    await Promise.all(candidates.slice(i, i + BATCH).map((c) => enrichCandidate(c)));
  }
}

const SYSTEM_PROMPT = `Tu es un expert en développement commercial export du vin pour WineExporters.

Ta mission est de sélectionner les importateurs/distributeurs les plus pertinents pour un domaine viticole donné, à partir :
1. du profil du domaine ;
2. du marché ciblé ;
3. des préférences de prospection ;
4. d'une liste de sociétés candidates et d'informations factuelles publiques récupérées sur leurs sites web.

Tu dois t'appuyer uniquement sur les données fournies.

N'invente jamais d'informations.

N'affirme jamais qu'une société possède un positionnement, un portefeuille, un type de clientèle, une spécialisation ou un canal de distribution si cela n'est pas soutenu par les données fournies.

Lorsque peu d'informations sont disponibles sur une entreprise, formule la justification avec prudence.

PRIORITÉ ABSOLUE : IMPORTATEURS / DISTRIBUTEURS

La priorité absolue est de sélectionner des sociétés réellement pertinentes pour l'importation et la distribution de vin sur le marché ciblé.

Privilégie en priorité les entreprises pour lesquelles les données fournies indiquent ou suggèrent de manière solide une activité de :
- importation de vin ;
- distribution de vin ;
- grossiste en vin ;
- agent / broker / représentant ;
- achat direct auprès de producteurs étrangers ;
- fourniture professionnelle au réseau HORECA / cavistes / retail.

Ne privilégie jamais un retailer, caviste, boutique, wine bar ou site e-commerce B2C à un importateur/distributeur simplement parce que son site contient davantage d'informations.

Un retailer pur ou caviste pur ne doit apparaître que s'il existe des éléments suffisamment solides montrant qu'il importe, distribue ou source directement les vins.

LES CRITÈRES DU FORMULAIRE SONT SECONDAIRES

Les informations du domaine servent à PERSONNALISER et PRIORISER les importateurs, mais ne doivent pas transformer la recherche en quête du « match parfait ».

Les critères suivants sont secondaires :
- types de vins ;
- appellations / cuvées ;
- cœur de gamme prix ;
- certifications ;
- préférences de type d'importateur.

Ils servent principalement à départager plusieurs importateurs déjà pertinents.

Ne rejette pas un bon importateur de vin simplement parce que son site ne mentionne pas explicitement le cépage, l'appellation, la certification ou le niveau de prix du domaine.

Un importateur professionnel, actif, multi-régions ou multi-catégories peut rester très pertinent même si son site ne permet pas de confirmer précisément tous les critères du domaine.

SCORING : PRIORITÉ DE PROSPECTION

Le score de 1 à 10 représente une priorité de prospection au sein d'une shortlist déjà qualifiée, et non une probabilité de succès commercial.

Barème :
- 9–10/10 : importateur/distributeur clairement identifié, activité professionnelle solide, forte cohérence avec le domaine ou plusieurs signaux pertinents.
- 8/10 : importateur/distributeur solide et exploitable, avec une bonne cohérence générale avec le profil du domaine.
- 7/10 : importateur/distributeur pertinent à prospecter, même si certaines informations manquent ou si l'adéquation est moins directe.
- Moins de 7/10 : à ne PAS inclure dans la shortlist.

Ne retourne jamais un contact avec un score inférieur à 7/10.

Ne complète jamais artificiellement la shortlist avec des profils faibles pour atteindre 10 résultats.
Si seulement 6 ou 8 contacts méritent 7/10 ou plus, retourne uniquement ces 6 ou 8 contacts.

Un retailer/caviste non confirmé comme importateur/distributeur ne doit pas être noté 7/10 ou plus.

La qualité prime sur le volume : retourne au maximum 10 sociétés, uniquement des profils réellement pertinents à prospecter, sans aucune obligation d'atteindre 10.

TON DES JUSTIFICATIONS

Les justifications doivent rester crédibles mais positives et orientées action : pour chaque profil retenu, explique pourquoi il mérite d'être contacté.

Évite les formulations inutilement dépréciatives comme « peu pertinent », « faible adéquation », « pas parfaitement aligné », « la sélection manque de candidats », « peu d'informations disponibles donc intérêt limité », « profil éloigné du domaine ».

Si un profil n'est pas suffisamment pertinent, ne l'affiche pas.

Exemples de formulations adaptées :
- « Profil pertinent pour une première prise de contact »
- « Structure professionnelle disposant d'un portefeuille international »
- « Importateur à considérer en priorité pour son positionnement et son réseau »
- « Présente plusieurs signaux cohérents avec le profil du domaine »
- « Acteur pertinent à tester dans une première vague de prospection »

Reste factuel : n'invente pas de portefeuille, de canal ou de spécialisation.

SYNTHÈSE MARCHÉ

La synthèse ne doit pas saboter commercialement le résultat.

Supprime toute formulation mettant directement en doute la valeur de la shortlist affichée, comme « la présente sélection manque de candidats parfaitement alignés », « peu d'acteurs correspondent réellement » ou « plusieurs profils sont davantage des cavistes ».

Si la qualité des candidats est hétérogène : n'affiche que ceux à 7/10 ou plus et présente la synthèse de manière constructive.

Exemple de ton attendu :
« Les profils sélectionnés montrent plusieurs voies de prospection pertinentes pour le domaine, avec des acteurs disposant d'une capacité d'importation/distribution et d'une exposition aux vins français ou européens. La shortlist combine des profils complémentaires, à tester en priorité selon le positionnement du domaine. »

Important : n'invente aucune donnée générale sur le marché national. La synthèse doit rester basée sur les sociétés analysées et sur le profil du domaine.

APPROCHE RECOMMANDÉE

Les recommandations doivent rester simples et commerciales (maximum 3) :
- quels profils contacter en premier ;
- quel argument du domaine mettre en avant ;
- quel type d'approche commerciale privilégier.

Évite les recommandations trop complexes ou trop proches d'une mission de conseil approfondie.

FORMAT DE SORTIE

Retourne UNIQUEMENT un JSON valide, sans markdown autour, au format strict suivant :

{
  "shortlist": [
    {
      "buyer_contact_id": "string",
      "company_name": "string",
      "website_url": "string|null",
      "city": "string|null",
      "score": 7,
      "reason": "explication concise en français en 1 à 2 phrases, basée uniquement sur les éléments fournis"
    }
  ],
  "market_summary": "synthèse concise en français de 2 à 3 paragraphes maximum",
  "recommended_approach": [
    "recommandation concrète 1",
    "recommandation concrète 2",
    "recommandation concrète 3"
  ]
}`;

const listOr = (v: unknown, fallback = "Non précisé") => {
  if (Array.isArray(v) && v.length > 0) return v.join(", ");
  return fallback;
};
const textOr = (v: unknown, fallback = "Non précisé") => {
  const s = String(v ?? "").trim();
  return s || fallback;
};

function buildUserPrompt(row: any, candidates: Candidate[]): string {
  const companies = candidates
    .map((c) => {
      const contactable = Boolean(c.email) && Boolean(c.company_name);
      return [
        `- buyer_contact_id: ${c.buyer_contact_id}`,
        `  company_name: ${c.company_name}`,
        `  city: ${textOr(c.city)}`,
        `  country: ${textOr(c.country)}`,
        `  website_url: ${textOr(c.website_url, "Aucun")}`,
        `  coordonnees_exploitables: ${contactable ? "oui" : "non"}`,
        `  website_text: ${c.website_text ? c.website_text : "Aucune information publique récupérée"}`,
      ].join("\n");
    })
    .join("\n\n");

  return `## Domaine

Nom : ${textOr(row.winery_name)}
Localisation / appellation : ${textOr(row.winery_location)}
Site internet : ${textOr(row.website)}

## Vins à développer

Types de vins : ${listOr(row.wine_types)}
Principales appellations ou cuvées : ${textOr(row.appellations_cuvees)}
Cœur de gamme export : ${textOr(row.export_price_range)}
Certifications : ${listOr(row.certifications, "Aucune")}

## Recherche souhaitée

Marché cible : ${textOr(row.target_country)}
Types d'importateurs recherchés : ${listOr(row.importer_preferences, "Non précisé — à toi de sélectionner les profils les plus pertinents")}
Acteurs ou circuits à éviter : ${textOr(row.exclusions, "Aucun")}
Précisions supplémentaires : ${textOr(row.additional_context, "Aucune")}

## Sociétés candidates

${companies}

Retourne uniquement le JSON demandé.`;
}

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
  return (data?.content?.[0]?.text ?? "") as string;
}

function extractJson(text: string): any {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fence ? fence[1] : text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Réponse IA sans JSON exploitable");
  return JSON.parse(raw.slice(start, end + 1));
}

/** Validation stricte : aucune société inventée, scores bornés, pas de coordonnées. */
function validateResult(parsed: any, candidates: Candidate[]) {
  if (!parsed || typeof parsed !== "object") throw new Error("JSON IA invalide");
  if (!Array.isArray(parsed.shortlist)) throw new Error("shortlist manquante ou invalide");
  if (parsed.shortlist.length > 10) throw new Error("shortlist supérieure à 10 résultats");
  const summary = String(parsed.market_summary ?? "").trim();
  if (!summary) throw new Error("market_summary manquante");
  if (!Array.isArray(parsed.recommended_approach) || parsed.recommended_approach.length === 0) {
    throw new Error("recommended_approach manquante ou invalide");
  }

  const byId = new Map(candidates.map((c) => [c.buyer_contact_id, c]));
  const seen = new Set<string>();
  const shortlist = parsed.shortlist.map((item: any) => {
    const id = String(item?.buyer_contact_id ?? "");
    const source = byId.get(id);
    if (!source) throw new Error(`Société inconnue retournée par l'IA (${id || "sans identifiant"})`);
    if (seen.has(id)) throw new Error("Société dupliquée dans la shortlist");
    seen.add(id);
    const score = Number(item?.score);
    if (!Number.isFinite(score) || score < 1 || score > 10) {
      throw new Error(`Score hors bornes pour ${source.company_name}`);
    }
    // Filet de sécurité produit : aucun profil sous 7/10 n'est jamais affiché
    // au prospect, même si le modèle en retournait un.
    if (score < 7) return null;
    const reason = String(item?.reason ?? "").trim();
    if (!reason) throw new Error(`Justification manquante pour ${source.company_name}`);
    // Les valeurs factuelles sont réalignées sur la base : l'IA ne peut ni
    // inventer une société ni ajouter des coordonnées.
    return {
      buyer_contact_id: source.buyer_contact_id,
      company_name: source.company_name,
      website_url: source.website_url,
      city: source.city,
      country: source.country,
      score: Math.round(score),
      reason,
    };
  }).filter(Boolean);

  return {
    shortlist,
    market_summary: summary,
    recommended_approach: parsed.recommended_approach
      .map((r: unknown) => String(r ?? "").trim())
      .filter(Boolean),
  };
}

// Notification interne (équipe WineExporters). Un échec d'email ne doit jamais
// impacter l'analyse : l'erreur est simplement journalisée.
async function notifyInternal(searchId: string) {
  try {
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-prospect-market-analysis`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ prospect_market_search_id: searchId }),
    });
    if (!res.ok) {
      console.error("internal notification failed", searchId, res.status, await res.text());
    }
  } catch (err) {
    console.error("internal notification error", searchId, err);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let id: string | undefined;
  try {
    const body = await req.json();
    id = body?.prospect_market_search_id;
  } catch (_) {}
  if (!id) return json({ error: "prospect_market_search_id required" }, 400);

  const { data: row, error: rowErr } = await supabase
    .from("prospect_market_searches")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (rowErr || !row) return json({ error: "request not found" }, 404);

  if (row.status === "completed") return json({ status: "completed" });
  if (row.status === "processing") {
    const started = row.processed_at ?? row.created_at;
    const ts = started ? new Date(started).getTime() : 0;
    if (Date.now() - ts < 5 * 60 * 1000) return json({ error: "already processing" }, 409);
  }

  await supabase
    .from("prospect_market_searches")
    .update({ status: "processing", processing_error: null, processed_at: new Date().toISOString() })
    .eq("id", id);

  const fail = async (message: string) => {
    console.error("prospect-market-analysis failed", id, message);
    await supabase
      .from("prospect_market_searches")
      .update({ status: "failed", processing_error: message.slice(0, 2000) })
      .eq("id", id);
    return json({ error: message }, 500);
  };

  try {
    const marketName = String(row.target_country ?? "").trim();
    if (!marketName) return await fail("Marché cible manquant sur la demande");

    const { data: allCountries, error: cListErr } = await supabase
      .from("buyer_contacts")
      .select("country")
      .not("country", "is", null);
    if (cListErr) throw cListErr;

    const variants = resolveCountryVariants(
      marketName,
      (allCountries ?? []) as { country: string | null }[],
    );

    const { data: contacts, error: cErr } = await supabase
      .from("buyer_contacts")
      .select("id, company_name, email, phone, website_url, city, country")
      .in("country", variants)
      .limit(500);
    if (cErr) throw cErr;

    const candidates = preselect((contacts ?? []) as any[]);

    if (candidates.length === 0) {
      // Aucun contact exploitable : on termine proprement, sans appeler l'IA
      // et sans inventer de résultats.
      await supabase
        .from("prospect_market_searches")
        .update({
          status: "completed",
          result_json: { shortlist: [], market_summary: null, recommended_approach: [] },
          result_summary: null,
          processing_error: null,
          processed_at: new Date().toISOString(),
        })
        .eq("id", id);
      await notifyInternal(id);
      return json({ status: "completed", shortlist: 0 });
    }

    await enrichAll(candidates);

    const raw = await callAnthropic(SYSTEM_PROMPT, buildUserPrompt(row, candidates));
    const validated = validateResult(extractJson(raw), candidates);

    await supabase
      .from("prospect_market_searches")
      .update({
        status: "completed",
        result_json: validated,
        result_summary: validated.market_summary,
        processing_error: null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", id);

    await notifyInternal(id);
    return json({ status: "completed", shortlist: validated.shortlist.length });
  } catch (err) {
    return await fail(err instanceof Error ? err.message : String(err));
  }
});
