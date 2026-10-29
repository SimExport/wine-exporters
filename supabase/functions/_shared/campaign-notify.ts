// React-free helpers for producer campaign notifications (scheduled + launched).
// Shared by Edge Functions and the admin UI (estimate). Results wording is NOT here (unchanged).

export const QUEUE_CRON_HOUR_UTC = 8; // campaign-send-queue-daily: 0 8 * * * UTC
const PARIS_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });

/** Paris civil day (yyyy-mm-dd) of the estimated queue send for `position` (1 = next). */
export function estimateQueueDay(position: number, quotaUsedToday: boolean, now: Date = new Date()): string {
  const parisToday = PARIS_DAY.format(now);
  // 08:00 UTC is always on the same Paris date as the UTC date.
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + (now.getUTCHours() >= QUEUE_CRON_HOUR_UTC ? 1 : 0)));
  const baseDay = base.toISOString().slice(0, 10);
  const extra = (baseDay === parisToday && quotaUsedToday ? 1 : 0) + Math.max(0, position - 1);
  return new Date(base.getTime() + extra * 86_400_000).toISOString().slice(0, 10);
}

export type Lang = "fr" | "en";
export const langOf = (v: unknown): Lang => (String(v ?? "").toLowerCase().startsWith("en") ? "en" : "fr");

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** Long Paris date, e.g. "jeudi 30 octobre 2026" / "Thursday, October 30, 2026". */
export function formatParisDay(day: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", year: "numeric" })
    .format(new Date(`${day}T12:00:00Z`));
}
export function formatParisDateTime(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
    .format(new Date(iso)) + (lang === "en" ? " (Paris time)" : " (heure de Paris)");
}

export const campaignUrl = (id: string) => `https://wine-exporters.com/campaigns/${id}`;

function layout(h1: string, paragraphs: string[], cta: string, url: string, footer: string) {
  return `<div style="font-family:Arial,sans-serif;background-color:#f5f1ee;padding:32px 16px;">
<div style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:8px;overflow:hidden;">
<div style="background-color:#59191F;padding:24px 32px;text-align:center;"><div style="color:#ffffff;font-size:24px;font-weight:700;">WineExporters</div><div style="color:#e8d4d6;font-size:12px;margin-top:4px;">by ExportVins</div></div>
<div style="padding:32px;"><h1 style="color:#59191F;font-size:22px;margin:0 0 16px;">${h1}</h1>
${paragraphs.map((p) => `<p style="color:#333333;font-size:15px;line-height:1.6;margin:0 0 16px;">${p}</p>`).join("\n")}
<p style="margin:12px 0 32px;text-align:center;"><a href="${url}" style="background-color:#59191F;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600;font-size:15px;">${cta}</a></p>
<p style="color:#888888;font-size:12px;margin:0;border-top:1px solid #eeeeee;padding-top:20px;">${footer}</p></div></div></div>`;
}

export interface BuiltEmail { subject: string; html: string }

export function buildScheduledEmail(lang: Lang, name: string, day: string, campaignId: string): BuiltEmail {
  const n = esc(name); const d = formatParisDay(day, lang); const url = campaignUrl(campaignId);
  return lang === "en" ? {
    subject: `Your campaign "${name}" is approved and scheduled`,
    html: layout("Your campaign is approved and scheduled", [
      `Our team has reviewed and approved your campaign <strong style="color:#59191F;">${n}</strong>. It is now scheduled for sending.`,
      `Estimated sending date: <strong>${d}</strong> (Paris time). Campaigns are sent one per day, in approval order, so this date may still change slightly.`,
      `Results are expected about <strong>48–72 hours</strong> after the send is confirmed. We will email you when the campaign goes out.`,
    ], "View my campaign", url, "— The WineExporters team"),
  } : {
    subject: `Votre campagne « ${name} » est validée et programmée`,
    html: layout("Votre campagne est validée et programmée", [
      `Notre équipe a relu et validé votre campagne <strong style="color:#59191F;">${n}</strong>. Elle est maintenant programmée pour l’envoi.`,
      `Date d’envoi estimée : <strong>${d}</strong> (heure de Paris). Les campagnes partent une par jour, dans l’ordre de validation : cette date peut encore légèrement évoluer.`,
      `Les résultats sont attendus environ <strong>48 à 72 h</strong> après la confirmation de l’envoi. Nous vous écrirons au moment du départ.`,
    ], "Voir ma campagne", url, "— L’équipe WineExporters"),
  };
}

export function buildLaunchEmail(lang: Lang, name: string, launchedAtIso: string, campaignId: string, markets: string[]): BuiltEmail {
  const n = esc(name); const at = formatParisDateTime(launchedAtIso, lang); const url = campaignUrl(campaignId);
  const m = esc(markets.join(", "));
  return lang === "en" ? {
    subject: `Your campaign "${name}" has been sent`,
    html: layout("Your campaign has been sent", [
      `Your campaign <strong style="color:#59191F;">${n}</strong> was sent on <strong>${at}</strong>.`,
      ...(m ? [`Target markets: <strong>${m}</strong>.`] : []),
      `Results are expected in about <strong>48–72 hours</strong>.`,
    ], "Track my campaign", url, "— The WineExporters team"),
  } : {
    subject: `Votre campagne « ${name} » est envoyée`,
    html: layout("Votre campagne est envoyée", [
      `Votre campagne <strong style="color:#59191F;">${n}</strong> est partie le <strong>${at}</strong>.`,
      ...(m ? [`Marchés ciblés : <strong>${m}</strong>.`] : []),
      `Les résultats sont attendus dans environ <strong>48 à 72 h</strong>.`,
    ], "Suivre ma campagne", url, "— L’équipe WineExporters"),
  };
}

/**
 * Sends one notification at most once per (campaign, event): a durable 'sending' claim in
 * campaign_email_logs (unique partial index) precedes Resend. Failure marks the claim 'failed'
 * so an admin may retry; an existing 'sent'/'sending' claim means skip.
 */
export async function sendOnce(
  admin: any, resendKey: string, fetchFn: typeof fetch,
  opts: { campaignId: string; eventType: string; to: string; bcc?: string; email: BuiltEmail },
): Promise<"sent" | "skipped" | "failed"> {
  const { data: prior } = await admin.from("campaign_email_logs").select("id,status")
    .eq("campaign_id", opts.campaignId).eq("event_type", opts.eventType).in("status", ["sent", "sending"]).limit(1);
  if (prior?.length) return "skipped";
  const { data: claim, error: cErr } = await admin.from("campaign_email_logs").insert({
    campaign_id: opts.campaignId, event_type: opts.eventType, recipient: opts.to, bcc: opts.bcc ?? null,
    subject: opts.email.subject, status: "sending",
  }).select("id").maybeSingle();
  if (cErr || !claim) return "skipped"; // unique index: another caller holds the claim
  try {
    const r = await fetchFn("https://api.resend.com/emails", {
      method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({ from: "WineExporters <simon@exportvins.fr>", to: [opts.to], ...(opts.bcc ? { bcc: [opts.bcc] } : {}), reply_to: "simon@exportvins.fr", subject: opts.email.subject, html: opts.email.html }),
    });
    const body = await r.text();
    if (!r.ok) {
      await admin.from("campaign_email_logs").update({ status: "failed", error_message: `${r.status}: ${body.slice(0, 300)}` }).eq("id", claim.id);
      return "failed";
    }
    let id: string | null = null; try { id = JSON.parse(body)?.id ?? null; } catch { /* ignore */ }
    await admin.from("campaign_email_logs").update({ status: "sent", resend_id: id }).eq("id", claim.id);
    return "sent";
  } catch (e) {
    // Network outcome unknown: keep 'sending' (no blind resend); admin reconciles via Resend logs.
    await admin.from("campaign_email_logs").update({ error_message: `uncertain: ${String((e as any)?.message ?? e).slice(0, 200)}` }).eq("id", claim.id);
    return "failed";
  }
}
