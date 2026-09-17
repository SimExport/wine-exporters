// Notification interne (usage administratif) envoyée à l'équipe WineExporters
// lorsqu'une analyse de marché prospect est terminée avec succès.
// Jamais envoyée au prospect.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INTERNAL_RECIPIENT = "simon@exportvins.fr";
const FROM = "WineExporters <notifications@exportvins.fr>";
const SITE_URL = "https://wine-exporters.com";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const WINE_TYPE_LABELS: Record<string, string> = {
  red: "Rouge",
  white: "Blanc",
  rose: "Rosé",
  sparkling: "Effervescent",
  sweet: "Doux",
  orange: "Orange / macération",
  other: "Autre",
};

const CERTIFICATION_LABELS: Record<string, string> = {
  organic: "Bio",
  biodynamic: "Biodynamie",
  hve: "HVE",
  vegan: "Vegan",
  other: "Autre",
  none: "Aucune",
};

const PRICE_LABELS: Record<string, string> = {
  "3-5": "3–5 € EXW",
  "5-7": "5–7 € EXW",
  "8-10": "8–10 € EXW",
  "10+": "Plus de 10 € EXW",
};

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function labelList(values: unknown, map: Record<string, string>): string {
  if (!Array.isArray(values) || values.length === 0) return "";
  return values.map((v) => map[String(v)] ?? String(v)).join(", ");
}

function row(label: string, value: string): string {
  if (!value) return "";
  return `
    <tr>
      <td style="padding: 6px 12px 6px 0; color: #7a6f66; font-size: 13px; vertical-align: top; white-space: nowrap;">${esc(label)}</td>
      <td style="padding: 6px 0; color: #2b2422; font-size: 14px;">${esc(value)}</td>
    </tr>`;
}

function truncate(text: string, max = 900): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trimEnd()}…`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let id: string | undefined;
  try {
    const body = await req.json();
    id = body?.prospect_market_search_id;
  } catch (_) {
    // corps invalide traité ci-dessous
  }
  if (!id || !UUID_RE.test(id)) {
    return json({ error: "prospect_market_search_id required" }, 400);
  }

  const { data: row_, error } = await supabase
    .from("prospect_market_searches")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !row_) return json({ error: "request not found" }, 404);

  // Uniquement les analyses réellement terminées.
  if (row_.status !== "completed") {
    return json({ skipped: "not completed" });
  }
  // Anti-doublon : une seule notification par analyse.
  if (row_.admin_notification_sent_at) {
    return json({ skipped: "already sent" });
  }

  const result = (row_.result_json ?? {}) as {
    shortlist?: Array<{
      company_name?: string | null;
      city?: string | null;
      score?: number | null;
      reason?: string | null;
    }>;
    market_summary?: string | null;
  };
  const shortlist = Array.isArray(result.shortlist) ? result.shortlist : [];
  const count = shortlist.length;

  const wineryName = String(row_.winery_name ?? "Domaine inconnu");
  const market = String(row_.target_country ?? "—");
  const subject = `Nouvelle analyse WineExporters — ${wineryName} — ${market}`;
  const preheader = `${count} importateurs prioritaires identifiés pour ${wineryName}.`;

  const infoRows = [
    row("Domaine", String(row_.winery_name ?? "")),
    row("Contact", String(row_.contact_name ?? "")),
    row("Email", String(row_.email ?? "")),
    row("Site", String(row_.website ?? "")),
    row("Localisation / appellation", String(row_.winery_location ?? "")),
    row("Marché ciblé", market === "—" ? "" : market),
    row(
      "Cœur de gamme",
      row_.export_price_range
        ? (PRICE_LABELS[String(row_.export_price_range)] ?? String(row_.export_price_range))
        : "",
    ),
    row("Types de vins", labelList(row_.wine_types, WINE_TYPE_LABELS)),
    row("Certifications", labelList(row_.certifications, CERTIFICATION_LABELS)),
  ].join("");

  const topThree = shortlist.slice(0, 3).map((item) => `
    <div style="border: 1px solid #ecdfd2; border-radius: 6px; padding: 12px 14px; margin-bottom: 10px;">
      <div style="display: block; color: #59191F; font-size: 15px; font-weight: 700;">
        ${esc(item.company_name ?? "—")}
        <span style="color: #C9A84C; font-weight: 700; font-size: 13px;">&nbsp;·&nbsp;${esc(item.score ?? "—")}/10</span>
      </div>
      ${item.city ? `<div style="color: #7a6f66; font-size: 12px; margin-top: 2px;">${esc(item.city)}</div>` : ""}
      ${item.reason ? `<div style="color: #2b2422; font-size: 13px; line-height: 1.5; margin-top: 6px;">${esc(item.reason)}</div>` : ""}
    </div>`).join("");

  const summary = String(result.market_summary ?? row_.result_summary ?? "").trim();

  const adminUrl = `${SITE_URL}/admin/market-analyses`;
  const prospectUrl = `${SITE_URL}/market-analysis/result/${row_.id}`;

  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; background-color: #FAF6F0; padding: 28px 16px;">
    <span style="display: none; font-size: 1px; color: #FAF6F0;">${esc(preheader)}</span>
    <div style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(89,25,31,0.08);">
      <div style="background-color: #59191F; padding: 24px 32px;">
        <div style="color: #ffffff; font-size: 20px; font-weight: 700;">Nouvelle analyse WineExporters</div>
        <div style="color: #e8d4d6; font-size: 13px; margin-top: 6px;">Une nouvelle demande de recherche personnalisée vient d'être traitée.</div>
      </div>

      <div style="padding: 28px 32px;">
        <h2 style="color: #59191F; font-size: 15px; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.5px;">Prospect</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 0 0 26px;">${infoRows}</table>

        <h2 style="color: #59191F; font-size: 15px; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.5px;">Résultat</h2>
        <p style="color: #2b2422; font-size: 15px; margin: 0 0 14px;"><strong>${count}</strong> importateurs prioritaires identifiés</p>
        ${topThree}
        ${count > 3 ? `<p style="color: #7a6f66; font-size: 12px; margin: 4px 0 0;">+ ${count - 3} autres dans l'analyse complète.</p>` : ""}

        ${summary ? `
        <h2 style="color: #59191F; font-size: 15px; margin: 26px 0 10px; text-transform: uppercase; letter-spacing: 0.5px;">Synthèse</h2>
        <div style="background-color: #FAF6F0; border-left: 3px solid #C9A84C; padding: 12px 14px; color: #2b2422; font-size: 13px; line-height: 1.6; white-space: pre-line;">${esc(truncate(summary))}</div>` : ""}

        <p style="margin: 28px 0 0;">
          <a href="${adminUrl}" style="background-color: #59191F; color: #ffffff; padding: 12px 22px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 14px;">Voir l'analyse côté admin</a>
          <a href="${prospectUrl}" style="color: #59191F; padding: 12px 18px; text-decoration: none; border: 1px solid #59191F; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 14px; margin-left: 8px;">Voir la page prospect</a>
        </p>
      </div>

      <div style="background-color: #2b2422; padding: 16px 32px;">
        <div style="color: #b8aca3; font-size: 11px;">Notification interne WineExporters — ne pas transférer au prospect.</div>
      </div>
    </div>
  </div>`;

  try {
    const { error: sendError } = await resend.emails.send({
      from: FROM,
      to: [INTERNAL_RECIPIENT],
      subject,
      html,
    });
    if (sendError) throw new Error(sendError.message ?? String(sendError));

    await supabase
      .from("prospect_market_searches")
      .update({
        admin_notification_sent_at: new Date().toISOString(),
        admin_notification_error: null,
      })
      .eq("id", id);

    return json({ sent: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("notify-prospect-market-analysis failed", id, message);
    // L'échec de la notification interne ne doit jamais impacter l'analyse :
    // le statut reste `completed`, seule l'erreur email est enregistrée.
    await supabase
      .from("prospect_market_searches")
      .update({ admin_notification_error: message.slice(0, 2000) })
      .eq("id", id);
    return json({ sent: false, error: message }, 500);
  }
});
