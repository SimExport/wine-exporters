// ExportVins Mission Performance invitation: never grants 'paid', never touches Stripe.
import { layout, sendResend, esc, BOOKING_URL } from "../_shared/we-email.ts";

type Contact = {
  company_name?: string; country?: string; contact_name?: string; email?: string;
  phone?: string; website?: string; address?: string; cuvees?: string;
  comments?: string; next_action?: string;
};
const s = (v: unknown, max = 500) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
const norm = (v: string | null | undefined) => (v || "").trim().toLowerCase();

async function findUserId(admin: any, email: string): Promise<string | null> {
  for (let page = 1; page <= 20; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const u = data?.users?.find((x: any) => (x.email || "").toLowerCase() === email);
    if (u) return u.id;
    if (!data?.users || data.users.length < 1000) return null;
  }
  return null;
}

export async function handleExportVins(admin: any, adminId: string, email: string, body: any) {
  const domainName = s(body.domainName, 200);
  const missionName = s(body.missionName, 200);
  const discountEligible = body.discountEligible !== false;
  const lang: "fr" | "en" = body.lang === "en" ? "en" : "fr";
  const skipEmail = body.skipEmail === true; // test-only
  const contacts: Contact[] = Array.isArray(body.contacts) ? body.contacts.slice(0, 500) : [];
  if (!domainName || !missionName) return { error: "Nom du domaine et nom de mission obligatoires." };
  if (contacts.length === 0) return { error: "Aucun contact à importer." };

  const { data: logRow } = await admin.from("admin_invitations").insert({
    email, status: "pending", invited_by: adminId,
    invitation_type: "exportvins", domain_name: domainName, mission_name: missionName,
  }).select("id").maybeSingle();
  const fail = async (msg: string, extra: Record<string, unknown> = {}) => {
    if (logRow?.id) await admin.from("admin_invitations").update({ status: "failed", error_message: msg, ...extra }).eq("id", logRow.id);
    return { error: msg };
  };

  try {
    // 1-2. Reuse or create the account (no email here, no paid role)
    let userId = await findUserId(admin, email);
    let created = false;
    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({
        email, email_confirm: true, user_metadata: { display_name: domainName },
      });
      if (error || !data?.user) return await fail(error?.message || "Création du compte impossible.");
      userId = data.user.id; created = true;
      await admin.from("profiles").update({ domain_name: domainName }).eq("user_id", userId);
      if (lang === "en") await admin.from("user_settings").update({ ui_language: "en" }).eq("user_id", userId);
    }

    // 3. Trial entitlement (skip if premium). Never restarts/extends an existing trial.
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const { data: prof } = await admin.from("profiles").select("subscription_plan").eq("user_id", userId).maybeSingle();
    const isPremium = (roles || []).some((r: any) => r.role === "admin" || r.role === "paid")
      || (!!prof?.subscription_plan && prof.subscription_plan !== "none");
    const { data: ent } = await admin.from("user_entitlements").select("id,discount_eligible")
      .eq("user_id", userId).eq("entitlement", "exportvins_crm_trial").maybeSingle();
    if (ent) {
      if (discountEligible && !ent.discount_eligible) {
        await admin.from("user_entitlements").update({ discount_eligible: true }).eq("id", ent.id);
      }
    } else if (!isPremium) {
      const { error } = await admin.from("user_entitlements").insert({
        user_id: userId, entitlement: "exportvins_crm_trial", status: "invited",
        mission_name: missionName, discount_eligible: discountEligible, invited_by: adminId,
      });
      if (error) return await fail("Droit d'essai : " + error.message);
    }

    // 4. Mission container + default stage
    const campaignName = `Mission ExportVins – ${missionName}`;
    let { data: camp } = await admin.from("campaigns").select("id").eq("user_id", userId).eq("name", campaignName).maybeSingle();
    if (!camp) {
      const r = await admin.from("campaigns").insert({
        user_id: userId, name: campaignName, status: "manual", target_markets: [], managed_by_bo: false,
      }).select("id").single();
      if (r.error) return await fail("Campagne : " + r.error.message);
      camp = r.data;
    }
    const STAGE = "Échantillons à envoyer";
    let { data: stage } = await admin.from("pipeline_stages").select("id").eq("user_id", userId).eq("name", STAGE).maybeSingle();
    if (!stage) {
      const { data: last } = await admin.from("pipeline_stages").select("position").eq("user_id", userId)
        .order("position", { ascending: false }).limit(1).maybeSingle();
      const r = await admin.from("pipeline_stages").insert({
        user_id: userId, name: STAGE, position: (last?.position ?? -1) + 1,
      }).select("id").single();
      stage = r.data ?? null;
    }

    // Dedupe against all existing leads of this user — never overwrite
    const { data: userCamps } = await admin.from("campaigns").select("id").eq("user_id", userId);
    const campIds = (userCamps || []).map((c: any) => c.id);
    const { data: existing } = campIds.length
      ? await admin.from("leads").select("email,company_name,country,import_key").in("campaign_id", campIds).limit(10000)
      : { data: [] as any[] };
    const keys = new Set<string>(), emails = new Set<string>(), companies = new Set<string>();
    for (const l of existing || []) {
      if (l.import_key) keys.add(l.import_key);
      if (l.email) emails.add(norm(l.email));
      if (l.company_name) companies.add(norm(l.company_name) + "|" + norm(l.country));
    }

    const rows: any[] = [];
    let duplicates = 0, invalid = 0;
    for (const c of contacts) {
      const company = s(c.company_name, 200), em = s(c.email, 255), country = s(c.country, 100);
      if (!company && !em) { invalid++; continue; }
      const key = `${norm(missionName)}|` + (em ? norm(em) : `${norm(company)}|${norm(country)}`);
      const compKey = norm(company) + "|" + norm(country);
      if (keys.has(key) || (em && emails.has(norm(em))) || (!em && company && companies.has(compKey))) { duplicates++; continue; }
      keys.add(key); if (em) emails.add(norm(em)); if (company) companies.add(compKey);
      const notes = [c.cuvees && `Cuvées sélectionnées : ${s(c.cuvees, 1000)}`, s(c.comments, 4000)].filter(Boolean).join("\n\n");
      rows.push({
        campaign_id: camp.id, buyer_id: key, import_key: key, mission_name: missionName,
        market: country || "", country, company_name: company, first_name: s(c.contact_name, 200),
        email: em, phone: s(c.phone, 50), website_url: s(c.website, 500), address_line1: s(c.address, 500),
        owner_notes: notes || null, next_action: s(c.next_action, 500),
        source: "exportvins_mission", stage_id: stage?.id ?? null, created_by: adminId,
      });
    }
    if (rows.length) {
      const { error } = await admin.from("leads").insert(rows);
      if (error) return await fail("Import des contacts : " + error.message);
    }

    // 5. Verify attachment
    const { count } = await admin.from("leads").select("id", { count: "exact", head: true })
      .eq("campaign_id", camp.id).eq("mission_name", missionName);

    // 6. Branded welcome email with a secure one-time Supabase link (never returned to the browser)
    if (!skipEmail) {
      let sendErr: string | null = null;
      const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
        type: "magiclink", email, options: { redirectTo: body.redirectTo || undefined },
      });
      const actionLink = link?.properties?.action_link;
      if (linkErr || !actionLink) sendErr = linkErr?.message || "Lien indisponible";
      else {
        try {
          const { subject, html } = welcomeEmail(lang, domainName, count ?? rows.length, actionLink);
          const id = await sendResend(email, subject, html);
          await admin.from("campaign_email_logs").insert({
            event_type: "exportvins_welcome", recipient: email, subject, status: "sent", resend_id: id ?? null,
          });
        } catch (e: any) { sendErr = e?.message || "Envoi impossible"; }
      }
      if (sendErr) {
        await fail("Contacts importés, mais email non envoyé : " + sendErr, { invited_user_id: userId, imported_count: rows.length });
        return { error: "Contacts importés, mais l'email n'a pas pu partir : " + sendErr, imported: rows.length };
      }
    }
    await admin.from("admin_invitations").update({
      status: skipEmail ? "pending" : "sent", invited_user_id: userId, imported_count: rows.length,
    }).eq("id", logRow?.id);

    return { success: true, created, isPremium, imported: rows.length, duplicates, invalid, totalInMission: count ?? rows.length, emailSent: !skipEmail };
  } catch (e: any) {
    return await fail(e?.message || "Erreur serveur");
  }
}

function welcomeEmail(lang: "fr" | "en", domain: string, n: number, url: string) {
  const d = esc(domain);
  if (lang === "en") return {
    subject: "Your WineExporters CRM is ready",
    html: layout({
      title: `Welcome to WineExporters, ${d}`,
      paragraphs: [
        "Your Performance Export Mission with ExportVins is complete and your report has been delivered.",
        `The qualified importers from your mission${n ? ` (${n})` : ""} are already waiting in your WineExporters CRM.`,
        "You get <strong>30 days of free CRM access</strong> to organise sample shipments, follow-ups and sales tracking. The 30 days start when you first log in.",
        "Afterwards, you can access the full WineExporters platform at a preferential rate of <strong>€99 excl. VAT/month</strong>, with no obligation to subscribe.",
      ],
      ctaLabel: "Open my CRM", ctaUrl: url,
      secondary: { label: "Book a call with us", url: BOOKING_URL },
      footer: "This link is personal and can only be used once. If it has expired, sign in from wine-exporters.com.",
    }),
  };
  return {
    subject: "Votre CRM WineExporters est prêt",
    html: layout({
      title: `Bienvenue sur WineExporters, ${d}`,
      paragraphs: [
        "Votre Mission Performance Export avec ExportVins est terminée et votre rapport vous a été remis.",
        `Les importateurs qualifiés de votre mission${n ? ` (${n})` : ""} sont déjà disponibles dans votre CRM WineExporters.`,
        "Vous bénéficiez de <strong>30 jours d'accès CRM offerts</strong> pour organiser vos envois d'échantillons, vos relances et votre suivi commercial. Les 30 jours démarrent lors de votre première connexion.",
        "Vous pourrez ensuite accéder à toute la plateforme WineExporters au tarif privilégié de <strong>99 € HT/mois</strong>, sans aucune obligation de souscription.",
      ],
      ctaLabel: "Accéder à mon CRM", ctaUrl: url,
      secondary: { label: "Prendre rendez-vous avec nous", url: BOOKING_URL },
      footer: "Ce lien est personnel et utilisable une seule fois. S'il a expiré, connectez-vous depuis wine-exporters.com.",
    }),
  };
}
