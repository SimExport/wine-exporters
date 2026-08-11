// Sync Brevo campaign: pull global stats and/or import clickers as CRM leads.
// Requires admin role. Body: { campaign_id: string, mode: 'stats' | 'clicks' | 'both' }
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

const BREVO_BASE = "https://api.brevo.com/v3";

async function brevoGet(path: string, key: string) {
  const r = await fetch(`${BREVO_BASE}${path}`, {
    headers: { "api-key": key, accept: "application/json" },
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Brevo GET ${path} ${r.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
}

async function brevoPost(path: string, key: string, body: unknown) {
  const r = await fetch(`${BREVO_BASE}${path}`, {
    method: "POST",
    headers: {
      "api-key": key,
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Brevo POST ${path} ${r.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
}

// Extract unique open/click counts from Brevo campaign payload
function extractStats(payload: any): { opens: number; clicks: number } {
  const g = payload?.statistics?.globalStats ?? {};
  const opens =
    Number(g.uniqueViews ?? g.viewed ?? g.opens ?? 0) || 0;
  const clicks =
    Number(g.clickers ?? g.uniqueClicks ?? g.clicks ?? 0) || 0;
  return { opens, clicks };
}

// Poll Brevo processes endpoint until completed or timeout
async function pollProcess(
  processId: number | string,
  key: string,
  { timeoutMs = 45000, intervalMs = 3000 } = {},
): Promise<string | null> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const p = await brevoGet(`/processes/${processId}`, key);
    const status = String(p?.status ?? "").toLowerCase();
    const url =
      p?.export_url ||
      p?.exportUrl ||
      p?.link_to_recipients_export ||
      null;
    if (status === "completed" && url) return url as string;
    if (status === "failed" || status === "error") {
      throw new Error(`Brevo export process ${processId} failed`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}

function parseEmailsFromCsv(csv: string): string[] {
  const set = new Set<string>();
  const emailRe = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  const matches = csv.match(emailRe);
  if (matches) for (const m of matches) set.add(m.toLowerCase());
  return Array.from(set);
}

async function enrichClickerWithAI(input: {
  email: string;
  producer_name: string;
  campaign_name: string;
  producer_profile: Record<string, unknown>;
}): Promise<{ description: string; score: number }> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  const localPart = input.email.split("@")[0] ?? input.email;
  const domain = input.email.split("@")[1] ?? "";
  const fallback = {
    description: `A cliqué dans l'email de la campagne « ${input.campaign_name} » sans remplir le formulaire d'intérêt. Domaine : ${domain || "inconnu"}.`,
    score: 5,
  };
  if (!key) return fallback;
  try {
    const prompt = `You enrich a CRM record for a wine producer named "${input.producer_name}".
Producer profile: ${JSON.stringify(input.producer_profile)}
A wine importer / distributor clicked on a link in the campaign email "${input.campaign_name}" but did NOT fill the interest form yet. Only the email address is known.

Buyer email: ${input.email}
Local part: ${localPart}
Domain: ${domain}

Return STRICT JSON with two keys only:
{
  "description": "2-3 phrases EN FRANÇAIS déduisant la société probable à partir du domaine de l'email (type d'activité, adéquation probable avec le producteur). Ton neutre et professionnel. Si le domaine est générique (gmail, yahoo, hotmail, outlook…), indiquer que la société ne peut pas être déduite. Pas de formule de politesse. Garder les noms propres tels quels.",
  "score": "Integer 4-7 qualifying the lead on a /10 scale. Range is 4-7 because clicking is a passive signal, weaker than a form submission. Use 4 for generic free email, 5 standard, 6 for a plausible professional domain, 7 for a clear pro wine-import domain matching the producer profile."
}
No prose, no code fences. Le champ "description" doit impérativement être rédigé en français.`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
        system: "You output only valid JSON. No commentary, no code fences. All human-readable text fields must be written in French.",
      }),
    });
    if (!resp.ok) {
      console.error("Anthropic clicker error", resp.status, await resp.text().catch(() => ""));
      return fallback;
    }
    const data = await resp.json();
    const raw = data?.content?.[0]?.text;
    if (typeof raw !== "string") return fallback;
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
    const parsed = JSON.parse(cleaned);
    const parsedScore = Number(parsed?.score);
    return {
      description:
        typeof parsed?.description === "string" && parsed.description.trim()
          ? parsed.description.trim().slice(0, 2000)
          : fallback.description,
      score: Number.isFinite(parsedScore)
        ? Math.min(7, Math.max(4, Math.round(parsedScore)))
        : fallback.score,
    };
  } catch (e) {
    console.error("Clicker enrichment failed:", e);
    return fallback;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const BREVO_KEY = Deno.env.get("BREVO_API_KEY");
  if (!BREVO_KEY) return json(500, { error: "BREVO_API_KEY not configured" });

  // Auth
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
  const modeRaw = typeof body?.mode === "string" ? body.mode : "both";
  const mode = (["stats", "clicks", "both"].includes(modeRaw) ? modeRaw : "both") as
    | "stats"
    | "clicks"
    | "both";
  if (!campaign_id) return json(400, { error: "Missing campaign_id" });

  const { data: campaign, error: campErr } = await admin
    .from("campaigns")
    .select("id, name, user_id, brevo_campaign_id, target_markets")
    .eq("id", campaign_id)
    .maybeSingle();
  if (campErr || !campaign) return json(404, { error: "Campaign not found" });
  if (!campaign.brevo_campaign_id) return json(400, { error: "Missing brevo_campaign_id on campaign" });

  const brevoId = campaign.brevo_campaign_id;
  const result: {
    opens?: number;
    clicks?: number;
    imported_leads?: number;
    skipped?: number;
    total_clickers?: number;
  } = {};

  try {
    if (mode === "stats" || mode === "both") {
      const payload = await brevoGet(`/emailCampaigns/${brevoId}?statistics=globalStats`, BREVO_KEY);
      const { opens, clicks } = extractStats(payload);
      await admin
        .from("campaigns")
        .update({ stats_opens: opens, stats_clicks: clicks })
        .eq("id", campaign_id);
      result.opens = opens;
      result.clicks = clicks;
    }

    if (mode === "clicks" || mode === "both") {
      // 1) Ask Brevo to export clickers → returns processId
      const exportResp = await brevoPost(
        `/emailCampaigns/${brevoId}/exportRecipients`,
        BREVO_KEY,
        { recipientsType: "clickers" },
      );
      const processId =
        exportResp?.processId ?? exportResp?.id ?? exportResp?.process_id;
      if (!processId) throw new Error(`Brevo exportRecipients returned no processId: ${JSON.stringify(exportResp).slice(0, 300)}`);

      const exportUrl = await pollProcess(processId, BREVO_KEY);
      if (!exportUrl) throw new Error("Brevo export timed out");

      const csvResp = await fetch(exportUrl);
      if (!csvResp.ok) throw new Error(`Download export failed ${csvResp.status}`);
      const csv = await csvResp.text();
      const emails = parseEmailsFromCsv(csv);
      result.total_clickers = emails.length;

      if (emails.length === 0) {
        result.imported_leads = 0;
        result.skipped = 0;
      } else {
        // Exclude already-known emails
        const [{ data: interested }, { data: existingLeads }] = await Promise.all([
          admin
            .from("campaign_interested_contacts")
            .select("email")
            .eq("campaign_id", campaign_id),
          admin.from("leads").select("email").eq("campaign_id", campaign_id),
        ]);
        const known = new Set<string>();
        for (const r of interested ?? []) if (r?.email) known.add(String(r.email).toLowerCase());
        for (const r of existingLeads ?? []) if (r?.email) known.add(String(r.email).toLowerCase());
        const newEmails = emails.filter((e) => !known.has(e));

        // Producer profile for AI context
        let producer_profile: Record<string, unknown> = {};
        if (campaign.user_id) {
          const { data: profile } = await admin
            .from("profiles")
            .select("domain_name, aoc, city, country, target_buyer, strong_points")
            .eq("user_id", campaign.user_id)
            .maybeSingle();
          if (profile) producer_profile = profile as Record<string, unknown>;
        }
        const producer_name =
          (producer_profile?.domain_name as string) || campaign.name || "the producer";

        let imported = 0;
        const failed: string[] = [];
        const TLD_TO_MARKET: Record<string, string> = {
          au: "Australia", nz: "New Zealand", uk: "United Kingdom", gb: "United Kingdom",
          ie: "Ireland", nl: "Netherlands", be: "Belgium", de: "Germany", at: "Austria",
          ch: "Switzerland", fr: "France", es: "Spain", pt: "Portugal", it: "Italy",
          dk: "Denmark", se: "Sweden", no: "Norway", fi: "Finland", pl: "Poland",
          cz: "Czech Republic", gr: "Greece", jp: "Japan", cn: "China", hk: "Hong Kong",
          sg: "Singapore", kr: "South Korea", tw: "Taiwan", ca: "Canada", us: "United States",
          mx: "Mexico", br: "Brazil", ae: "United Arab Emirates",
        };
        const defaultMarket =
          (Array.isArray(campaign.target_markets) && campaign.target_markets[0]) || null;
        const marketFor = (email: string): string => {
          const domain = (email.split("@")[1] ?? "").toLowerCase();
          const parts = domain.split(".");
          for (let i = parts.length - 1; i >= 0; i--) {
            const t = parts[i];
            if (TLD_TO_MARKET[t]) return TLD_TO_MARKET[t];
          }
          if (defaultMarket) return String(defaultMarket);
          return "Unknown";
        };
        for (const email of newEmails) {
          const enriched = await enrichClickerWithAI({
            email,
            producer_name,
            campaign_name: campaign.name ?? "",
            producer_profile,
          });
          const domain = (email.split("@")[1] ?? "").toLowerCase();
          const GENERIC = new Set([
            "gmail.com", "yahoo.com", "yahoo.fr", "hotmail.com", "hotmail.fr",
            "outlook.com", "live.com", "icloud.com", "aol.com", "gmx.de",
            "web.de", "naver.com", "seznam.cz", "orange.fr", "free.fr", "wanadoo.fr",
          ]);
          // Never use the email local part as a company name — infer from the
          // domain when it is a real corporate domain, otherwise leave empty.
          const company_name =
            domain && !GENERIC.has(domain)
              ? (enriched as any).company_name?.trim?.() || domain
              : (enriched as any).company_name?.trim?.() || "";
          // Clickers stay in the campaign prospect list — the producer decides
          // manually whether to push them into their CRM.
          const { error: leadErr } = await admin
            .from("campaign_interested_contacts")
            .insert({
              campaign_id,
              company_name: company_name.slice(0, 120),
              contact_name: null,
              email,
              country: marketFor(email),
              description: enriched.description,
              recommended_actions: null,
              score: enriched.score,
              origin: "click",
              added_to_crm_by: [],
            });
          if (leadErr) {
            console.error("Clicker prospect insert failed:", email, leadErr.message);
            failed.push(email);
          } else imported++;
        }
        result.imported_leads = imported;
        result.skipped = emails.length - newEmails.length;
        if (failed.length) (result as any).failed = failed.length;
      }
    }

    return json(200, { ok: true, ...result });
  } catch (err: any) {
    console.error("sync-brevo-campaign error:", err?.message ?? err);
    return json(500, { error: err?.message ?? "Unknown error", ...result });
  }
});