// Daily: ExportVins trial emails at D+25, D+30, D+37. Idempotent via notified_* columns.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { layout, sendResend, BOOKING_URL, APP_URL } from "../_shared/we-email.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
type Step = "d25" | "d30" | "d37";

const COPY: Record<Step, Record<"fr" | "en", { subject: string; title: string; p: string[]; cta: string }>> = {
  d25: {
    fr: { subject: "Plus que 5 jours d'accès CRM offert", title: "Il vous reste 5 jours d'accès CRM offert",
      p: ["Votre accès CRM offert avec ExportVins se termine dans 5 jours.",
        "C'est le bon moment pour découvrir tout ce que WineExporters permet ensuite : opportunités d'importateurs, base internationale, campagnes et recherches sur mesure.",
        "Échangeons 20 minutes pour voir ce qui serait utile à votre domaine, avec le tarif privilégié de <strong>99 € HT/mois</strong>."],
      cta: "Prendre rendez-vous" },
    en: { subject: "5 days left of your free CRM access", title: "5 days left of your free CRM access",
      p: ["Your CRM access offered by ExportVins ends in 5 days.",
        "It's a good time to discover everything WineExporters offers next: importer opportunities, an international database, campaigns and custom searches.",
        "Let's spend 20 minutes on what would help your winery, with the preferential rate of <strong>€99 excl. VAT/month</strong>."],
      cta: "Book a call" },
  },
  d30: {
    fr: { subject: "Votre période CRM offerte est terminée", title: "Votre période gratuite est terminée",
      p: ["Vos 30 jours d'accès CRM offerts sont terminés. Vos contacts, notes et historiques sont conservés.",
        "Vous disposez encore de <strong>7 jours</strong> pour consulter et exporter vos données depuis votre CRM.",
        "Pour poursuivre votre suivi commercial, l'abonnement WineExporters vous est proposé à <strong>99 € HT/mois</strong> au lieu de 199 €. Parlons-en ensemble."],
      cta: "Prendre rendez-vous" },
    en: { subject: "Your free CRM period has ended", title: "Your free period has ended",
      p: ["Your 30 days of free CRM access have ended. Your contacts, notes and history are kept.",
        "You still have <strong>7 days</strong> to view and export your data from your CRM.",
        "To continue your sales follow-up, WineExporters is available at <strong>€99 excl. VAT/month</strong> instead of €199. Let's talk."],
      cta: "Book a call" },
  },
  d37: {
    fr: { subject: "Fin de votre période de récupération", title: "Votre période de récupération est terminée",
      p: ["La période de 7 jours pour exporter vos données est terminée et l'accès à votre CRM est désormais fermé.",
        "Vos données ne sont pas supprimées : en vous abonnant, vous retrouverez tous vos contacts, notes et historiques.",
        "Le tarif privilégié de <strong>99 € HT/mois</strong> reste disponible. Contactez-nous quand vous le souhaitez."],
      cta: "Échanger avec nous" },
    en: { subject: "Your recovery period has ended", title: "Your recovery period has ended",
      p: ["The 7-day period to export your data has ended and your CRM access is now closed.",
        "Your data is not deleted: by subscribing, you will find all your contacts, notes and history again.",
        "The preferential rate of <strong>€99 excl. VAT/month</strong> remains available. Get in touch whenever you like."],
      cta: "Talk to us" },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const dryRun = new URL(req.url).searchParams.get("dry") === "1";
  const now = Date.now();
  const { data: ents, error } = await admin.from("user_entitlements")
    .select("*").eq("entitlement", "exportvins_crm_trial").eq("status", "active").not("activated_at", "is", null);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });

  const out: any[] = [];
  for (const e of ents || []) {
    // Subscribed meanwhile → converted, no emails
    const { data: premium } = await admin.rpc("has_premium_access", { _user_id: e.user_id });
    if (premium) { if (!dryRun) await admin.from("user_entitlements").update({ status: "converted" }).eq("id", e.id); out.push({ id: e.id, converted: true }); continue; }

    const exp = new Date(e.expires_at).getTime(), grace = new Date(e.grace_ends_at).getTime();
    let step: Step | null = null;
    if (now >= grace && !e.notified_d37_at) step = "d37";
    else if (now >= exp && now < grace && !e.notified_d30_at) step = "d30";
    else if (now >= exp - 5 * 86400000 && now < exp && !e.notified_d25_at) step = "d25";
    if (!step) continue;

    const { data: u } = await admin.auth.admin.getUserById(e.user_id);
    const email = u?.user?.email;
    if (!email) continue;
    const { data: st } = await admin.from("user_settings").select("ui_language").eq("user_id", e.user_id).maybeSingle();
    const lang = (st?.ui_language || "fr").toLowerCase().startsWith("en") ? "en" : "fr";
    const c = COPY[step][lang];
    if (dryRun) { out.push({ id: e.id, step, email }); continue; }

    // Claim first (prevents double send if two runs overlap)
    const col = `notified_${step}_at`;
    const { data: claimed } = await admin.from("user_entitlements").update({ [col]: new Date().toISOString(), ...(step === "d37" ? { status: "expired" } : {}) })
      .eq("id", e.id).is(col, null).select("id");
    if (!claimed?.length) continue;
    try {
      const html = layout({ title: c.title, paragraphs: c.p, ctaLabel: c.cta, ctaUrl: BOOKING_URL,
        secondary: step !== "d37" ? { label: lang === "en" ? "Open my CRM" : "Ouvrir mon CRM", url: `${APP_URL}/pipeline` } : undefined,
        footer: "WineExporters by ExportVins" });
      const id = await sendResend(email, c.subject, html);
      await admin.from("campaign_email_logs").insert({ event_type: `exportvins_${step}`, recipient: email, subject: c.subject, status: "sent", resend_id: id ?? null });
      out.push({ id: e.id, step, sent: true });
    } catch (err: any) {
      await admin.from("campaign_email_logs").insert({ event_type: `exportvins_${step}`, recipient: email, subject: c.subject, status: "failed", error_message: String(err?.message || err) });
      out.push({ id: e.id, step, error: String(err?.message || err) });
    }
  }
  return new Response(JSON.stringify({ processed: out.length, out }), { headers: { ...cors, "Content-Type": "application/json" } });
});
