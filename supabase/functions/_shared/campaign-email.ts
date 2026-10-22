// Shared campaign email helpers (create-campaign, generate-campaign-email, send-campaign).
export const BREVO_LIST_IDS: Record<string, number> = {
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

export function normalizeCountry(c: string): string {
  return c.trim().toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/^united states.*$/, "usa")
    .replace(/^u\.?s\.?a?\.?$/, "usa")
    .replace(/^uk$/, "united kingdom")
    .replace(/^great britain$/, "united kingdom");
}

export function extractSubject(html: string, fallback: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const s = m?.[1]?.trim();
  return s && s.length > 0 ? s : fallback;
}

export function buildAnthropicUserMessage(data: {
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

export function buildOwnerEmailHtml(campaignName: string, markets: string[]): string {
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

export function escapeHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ---------- Lot A: structured content + fixed template ----------

export const INTEREST_BASE = "https://wine-exporters.com/interest/";

export interface EmailBlock {
  type: "heading" | "subtitle" | "text" | "image" | "bullets" | "signature";
  text?: string;
  url?: string;
  alt?: string;
  items?: { title: string; text: string }[];
}
export interface EmailContent { version: 1; subject: string; blocks: EmailBlock[] }

/** Returns the list of missing mandatory Brevo tags / links (empty = valid). */
export function missingEmailTags(html: string, subject: string, campaignId: string): string[] {
  const missing: string[] = [];
  if (!html.includes("{{ unsubscribe }}")) missing.push("{{ unsubscribe }}");
  if (!html.includes("{{ mirror }}")) missing.push("{{ mirror }}");
  if (!html.includes(INTEREST_BASE + campaignId)) missing.push("interest link");
  if (!subject.includes("{{ contact.COMPANY_NAME }}")) missing.push("{{ contact.COMPANY_NAME }} (subject)");
  return missing;
}

export function mapMarketsToLists(markets: string[]): { listIds: number[]; unmatched: string[] } {
  const listIds: number[] = []; const unmatched: string[] = [];
  for (const m of markets) {
    const id = BREVO_LIST_IDS[normalizeCountry(m)];
    if (id) { if (!listIds.includes(id)) listIds.push(id); } else unmatched.push(m);
  }
  return { listIds, unmatched };
}

// Allow only <strong>/<b>/<em>/<br>/<a href="http(s)"> in rich text; escape the rest.
export function sanitizeInline(s: string): string {
  const esc = escapeHtml(s ?? "");
  return esc
    .replace(/&lt;(\/?)(strong|b|em|i)&gt;/gi, "<$1$2>")
    .replace(/&lt;br\s*\/?&gt;/gi, "<br/>")
    .replace(/&lt;a href=&quot;(https?:\/\/[^&]+?)&quot;&gt;/gi, '<a href="$1" style="color:#be2d2d;">')
    .replace(/&lt;\/a&gt;/gi, "</a>");
}
const safeUrl = (u?: string) => (u && /^https:\/\//i.test(u) ? escapeHtml(u) : "");

export function renderEmailHtml(content: EmailContent, ctx: { campaignId: string; domainName: string; address: string }): string {
  const interest = INTEREST_BASE + ctx.campaignId;
  const body = content.blocks.map((b) => {
    switch (b.type) {
      case "heading": return `<h1 style="margin:0 0 12px;font-size:30px;line-height:1.25;color:#000000;font-weight:700;">${sanitizeInline(b.text ?? "")}</h1>`;
      case "subtitle": return `<p style="margin:0 0 20px;font-size:14px;font-style:italic;color:#555555;">${sanitizeInline(b.text ?? "")}</p>`;
      case "text": return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1a1a1a;">${sanitizeInline(b.text ?? "")}</p>`;
      case "image": { const u = safeUrl(b.url); return u ? `<a href="${interest}"><img src="${u}" alt="${escapeHtml(b.alt ?? "")}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border-radius:8px;margin:0 0 20px;border:0;"/></a>` : ""; }
      case "bullets": return `<p style="margin:8px 0 12px;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#5a3d2b;font-weight:600;">${sanitizeInline(b.text ?? `Why ${ctx.domainName} stands out`)}</p>` +
        (b.items ?? []).slice(0, 3).map((i) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1a1a1a;"><strong>${sanitizeInline(i.title)}</strong><br/>${sanitizeInline(i.text)}</p>`).join("") +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:16px 0 24px;"><a href="${interest}" style="display:inline-block;background:#be2d2d;color:#FFFEFE;padding:12px 24px;text-decoration:none;font-weight:600;">Send me the price list</a></td></tr></table>`;
      case "signature": return `<p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#1a1a1a;">${sanitizeInline(b.text ?? "")}</p>`;
      default: return "";
    }
  }).join("\n");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(content.subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700&display=swap" rel="stylesheet"/></head>
<body style="margin:0;padding:0;background:#fbfbfb;font-family:Rubik,Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbfbfb;"><tr><td align="center" style="padding:16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td align="center" style="padding:0 0 12px;font-size:12px;"><a href="{{ mirror }}" style="color:#555555;">View in browser</a></td></tr>
<tr><td style="padding:8px 0;">${body}</td></tr>
<tr><td align="center" style="padding:24px 0;font-size:12px;color:#666666;line-height:1.6;">${escapeHtml(ctx.domainName)}${ctx.address ? `<br/>${escapeHtml(ctx.address)}` : ""}<br/><a href="{{ unsubscribe }}" style="color:#666666;">Unsubscribe</a></td></tr>
</table></td></tr></table></body></html>`;
}

export const STRUCTURED_SYSTEM_PROMPT = `You are an expert email copywriter specializing in French wine export outreach to international importers.
Write entirely in English. Direct, professional tone, like a short personal note. Never use hollow phrases ("world-class", "passionate about wine", "unique terroir") without a concrete fact.
Whole body (subtitle + intro + bullets + closing) under 180 words. Lead with the single strongest, most specific selling point.
Return ONLY a JSON object, no markdown, with this exact shape:
{"subject": string starting with "{{ contact.COMPANY_NAME }}" followed by a specific hook,
 "heading": string (H1, may include {{ contact.COMPANY_NAME }}),
 "subtitle": string (one line: appellation and key wine(s)),
 "intro": string (2 sentences max, concrete facts),
 "bullets": [ {"title": string (short, no emoji), "text": string (1-2 sentences, one concrete fact, max 2 data points)} ] (EXACTLY 3),
 "closing": string (one specific personal sentence, signed with the contact name at the domain, e.g. "... <br/>Name, Domain")}
Allowed inline HTML in strings: <strong>, <em>, <br/>. No other HTML.`;

export function contentFromClaude(j: any, domainName: string): EmailContent {
  const bullets = Array.isArray(j?.bullets) ? j.bullets.slice(0, 3) : [];
  if (!j?.subject || !j?.heading || bullets.length !== 3) throw new Error("Claude returned incomplete content");
  return {
    version: 1,
    subject: String(j.subject),
    blocks: [
      { type: "heading", text: String(j.heading) },
      { type: "subtitle", text: String(j.subtitle ?? "") },
      { type: "text", text: String(j.intro ?? "") },
      { type: "bullets", text: `Why ${domainName} stands out`, items: bullets.map((b: any) => ({ title: String(b.title ?? ""), text: String(b.text ?? "") })) },
      { type: "signature", text: String(j.closing ?? "") },
    ],
  };
}
