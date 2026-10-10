// WineExporters branded email layout (bordeaux #59191F, cream, gold).
export const BOOKING_URL = "https://calendar.app.google/rfx7N1bBhJcbwyJg9";
export const APP_URL = "https://wine-exporters.com";
export const LOGO_URL = `${APP_URL}/logo-wineexporters.png`;
export const FROM = "WineExporters <notifications@exportvins.fr>";
export const REPLY_TO = "simon@exportvins.fr";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export { esc };

export function layout(opts: {
  title: string; paragraphs: string[]; ctaLabel: string; ctaUrl: string;
  secondary?: { label: string; url: string }; footer: string;
}) {
  const p = opts.paragraphs.map((t) =>
    `<p style="margin:0 0 16px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;line-height:1.6;color:#3b2a2c">${t}</p>`).join("");
  const sec = opts.secondary
    ? `<p style="margin:16px 0 0;text-align:center"><a href="${opts.secondary.url}" style="font-family:'DM Sans',Arial,sans-serif;font-size:14px;color:#59191F">${opts.secondary.label}</a></p>`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#ffffff">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;border:1px solid #eadfce;border-radius:12px;overflow:hidden">
<tr><td style="background:#59191F;padding:24px;text-align:center"><img src="${LOGO_URL}" alt="WineExporters" height="36" style="height:36px"></td></tr>
<tr><td style="background:#fbf7f0;padding:32px 28px">
<h1 style="margin:0 0 20px;font-family:'Caacupé One',Georgia,serif;font-size:24px;line-height:1.3;color:#59191F">${opts.title}</h1>
${p}
<p style="margin:24px 0 0;text-align:center"><a href="${opts.ctaUrl}" style="display:inline-block;background:#59191F;color:#ffffff;text-decoration:none;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;padding:12px 24px;border-radius:8px">${opts.ctaLabel}</a></p>
${sec}
</td></tr>
<tr><td style="padding:16px 28px;border-top:2px solid #c9a96e;font-family:'DM Sans',Arial,sans-serif;font-size:12px;color:#8a7a6e">${opts.footer}</td></tr>
</table></td></tr></table></body></html>`;
}

export async function sendResend(to: string, subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY not configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject, html }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(body)}`);
  return body?.id as string | undefined;
}
