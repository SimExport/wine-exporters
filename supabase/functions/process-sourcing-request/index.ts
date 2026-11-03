import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveCountryVariants } from "./country-variants.ts";
import { expandUsStateVariants, isUsMarket } from "./us-states.ts";
import { normalizeText, companyKey, websiteKey, emailKey, rankCandidates, evidenceReason } from "./selection.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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
  const text = data?.content?.[0]?.text ?? "";
  return text as string;
}

function extractJson(text: string): any {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fence ? fence[1] : text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in LLM response");
  return JSON.parse(raw.slice(start, end + 1));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let sourcing_request_id: string | undefined;
  let force = false;
  let dry_run = false;
  try {
    const body = await req.json();
    sourcing_request_id = body?.sourcing_request_id;
    force = body?.force === true;
    dry_run = body?.dry_run === true;
  } catch (_) {}
  if (!sourcing_request_id) return json({ error: "sourcing_request_id required" }, 400);
  if (dry_run && !force) return json({ error: "dry_run requires admin force" }, 403);

  // If force is requested, verify the caller is an admin via their JWT
  if (force) {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "auth required for force" }, 401);
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "invalid token" }, 401);
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "admin only" }, 403);
  }

  // Load request
  const { data: reqRow, error: reqErr } = await supabase
    .from("sourcing_requests")
    .select("*")
    .eq("id", sourcing_request_id)
    .maybeSingle();
  if (reqErr || !reqRow) return json({ error: "request not found" }, 404);

  // Subscriber requests must belong to the bearer-token owner.
  // The admin-only force mode is already checked above.
  if (!force) {
    const token=(req.headers.get("Authorization")??"").replace(/^Bearer\s+/i,"");
    if(!token) return json({error:"Authentication required"},401);
    const {data: currentUser,error: authErr}=await supabase.auth.getUser(token);
    if(authErr||!currentUser?.user||currentUser.user.id!==reqRow.user_id)
      return json({error:"Forbidden"},403);
    if(reqRow.status==="validated") return json({ok:true,already_validated:true});
  }

  // Idempotency: if in_progress < 5min, refuse
  if (reqRow.status === "in_progress" && reqRow.processing_started_at) {
    const started = new Date(reqRow.processing_started_at).getTime();
    if (Date.now() - started < 5 * 60 * 1000) {
      return json({ error: "already processing" }, 409);
    }
  }

  const userId: string = reqRow.user_id;

  // Check credit
  const { data: credits } = await supabase
    .from("user_credits")
    .select("search_credits")
    .eq("user_id", userId)
    .maybeSingle();
  const hasCredit = credits && (credits.search_credits ?? 0) >= 1;
  if (!hasCredit && !force) {
    await supabase.from("sourcing_requests").update({
      error_message: "Crédit de recherche insuffisant",
    }).eq("id", sourcing_request_id);
    return json({ error: "no_credits" }, 402);
  }

  // Decrement credit (only if available) + mark in_progress
  const previousCredits = credits?.search_credits ?? 0;
  if (hasCredit && !force && !dry_run) {
    const {data: consumed,error: creditErr}=await supabase.from("user_credits")
      .update({search_credits:previousCredits-1,updated_at:new Date().toISOString()})
      .eq("user_id",userId).eq("search_credits",previousCredits)
      .select("search_credits").maybeSingle();
    if(creditErr||!consumed) return json({error:"Credit changed during processing; retry"},409);
  }

  if (!dry_run) await supabase.from("sourcing_requests").update({
    status: "in_progress",
    processing_started_at: new Date().toISOString(),
    error_message: null,
  }).eq("id", sourcing_request_id);

  const refundCredit = async () => {
    if (!hasCredit || force || dry_run) return;
    await supabase.from("user_credits")
      .update({ search_credits: previousCredits, updated_at: new Date().toISOString() })
      .eq("user_id", userId).eq("search_credits",previousCredits-1);
  };

  try {
    // Load profile + wines
    const [{ data: profile }, { data: wines }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("wines").select("name, color, appellation, grapes, exw_price_eur, organic, is_biodynamic, is_natural, vintages, description").eq("user_id", userId).eq("is_active", true),
    ]);

    // Read the ENTIRE target market: never arbitrarily sample 500 rows.
    // Keep each enrichment record eligible regardless of how many fields are available.
    const marketName: string=reqRow.target_market;
    const canonical=resolveCountryVariants(marketName,[])[0]||marketName;
    const variants=Array.from(new Set([
      canonical, marketName,
      ...(normalizeText(canonical)==="united states"||normalizeText(canonical)==="usa"
         ? ["USA","United States","United States of America"]:[]),
      ...(normalizeText(canonical)==="united kingdom"
         ? ["United Kingdom","England (UK)","Scotland (UK)","Wales (UK)","Northern Ireland (UK)","UK"]:[])
    ]));
    const contactsAll:any[]=[];
    const pageSize=1000;
    for(let offset=0;offset<30000;offset+=pageSize){
      const {data: page,error: pageErr}=await supabase.from("buyer_contacts")
       .select("id,country,state,company_name,email,email_status,phone,website_url,city,full_address")
       .in("country",variants).order("id",{ascending:true}).range(offset,offset+pageSize-1);
      if(pageErr)throw pageErr;
      contactsAll.push(...(page??[]));
      if((page??[]).length<pageSize)break;
    }
    if(contactsAll.length===30000)throw new Error("Market fetch exceeded safety cap");
    let contacts=contactsAll;
    if(isUsMarket(marketName)&&Array.isArray(reqRow.states_filter)&&reqRow.states_filter.length){
      const validStates=expandUsStateVariants(contactsAll.map(c=>c.state),reqRow.states_filter);
      if(!validStates.length)throw new Error("No matching US state found");
      const stateSet=new Set(validStates);
      contacts=contactsAll.filter(c=>stateSet.has(c.state));
    }
    if(!contacts.length)throw new Error("Aucun contact disponible pour ce marché");

    const {data: history,error: historyErr}=await supabase.from("sourcing_requests")
      .select("target_market,result_json").eq("user_id",userId)
      .neq("id",sourcing_request_id).not("result_json","is",null).limit(150);
    if(historyErr)throw historyErr;
    const historic={names:new Set<string>(),sites:new Set<string>(),emails:new Set<string>()};
    const marketKeys=new Set(variants.map(normalizeText));
    for(const h of history??[]){
      const normalized=normalizeText(resolveCountryVariants(h.target_market,[])[0]||h.target_market);
      if(!marketKeys.has(normalized))continue;
      for(const c of (Array.isArray(h.result_json?.shortlist)?h.result_json.shortlist:[])){
        if(c.company_name)historic.names.add(companyKey(c.company_name));
        if(websiteKey(c.website_url))historic.sites.add(websiteKey(c.website_url));
        if(emailKey(c.email))historic.emails.add(emailKey(c.email));
      }
    }

    // Fetch all available commercial enrichment data (no status/percentage filter).
    const enriched=new Map<string,any>();
    const chunks:string[][]=[];
    for(let i=0;i<contacts.length;i+=200)
      chunks.push(contacts.slice(i,i+200).map(c=>c.id));
    for(let i=0;i<chunks.length;i+=4){
      const batch=await Promise.all(chunks.slice(i,i+4).map(ids=>
        supabase.from("buyer_contact_enrichments")
         .select("buyer_contact_id,company_type,description_fr,description_en,wine_origins,wine_regions,wine_appellations,wine_styles,wine_specialties,distribution_channels,direct_import_status,commercial_notes,source_urls,featured_producers,price_positioning")
         .in("buyer_contact_id",ids)));
      for(const result of batch){
        if(result.error)throw result.error;
        for(const row of result.data??[])enriched.set(row.buyer_contact_id,row);
      }
    }
    const ranked=rankCandidates(contacts,enriched,profile,wines??[],historic);
    // Give Claude real business signals, not only company names or websites.
    const selected=ranked.slice(0,85);
    const compactContacts=selected.map(c=>({
      id:c.id,company_name:c.company_name,city:c.city,
      company_type:c.enrichment?.company_type??null,
      wine_regions:c.enrichment?.wine_regions??[],
      wine_appellations:c.enrichment?.wine_appellations??[],
      wine_styles:c.enrichment?.wine_styles??[],
      wine_specialties:c.enrichment?.wine_specialties??[],
      distribution_channels:c.enrichment?.distribution_channels??[],
      direct_import_status:c.enrichment?.direct_import_status??"unknown",
      description:(c.enrichment?.description_fr||c.enrichment?.description_en||"").slice(0,480),
      commercial_notes:(c.enrichment?.commercial_notes||"").slice(0,200),
      source_urls:(c.enrichment?.source_urls||[]).slice(0,2)
    }));
    if(!selected.length)throw new Error("Aucun nouveau contact disponible après exclusion de l'historique");

    // Keep the producer facts limited to operational fields: avoid repeating
    // ambiguous origin stories and unverified annual bottle counts.
    const profileSummary={
      domain:profile?.domain_name,location:profile?.location,aoc:profile?.aoc,
      wine_types:profile?.wine_types,wine_colors:profile?.wine_colors,
      certifications:profile?.certifications,grape_varieties:profile?.grape_varieties,
      target_buyer_description:profile?.target_buyer_description
    };
    const systemPrompt=[
      "Tu es un analyste B2B vins export pour WineExporters.",
      "À partir d'une liste PRÉSÉLECTIONNÉE d'entreprises identifiées et de leurs données commerciales,",
      "sélectionne jusqu'à 15 candidats ayant les meilleures chances d'être acheteurs pour ce domaine.",
      "Ne sélectionne jamais un acteur uniquement sur son nom, sa ville, ou une spéculation.",
      "Évite les vendeurs non importateurs et les spécialistes exclusifs d'une catégorie non pertinente.",
      "Les données absentes sont simplement inconnues, ne pénalise pas l'absence de champs.",
      "Ne suppose jamais qu'un vin biologique est un vin nature.",
      "Ne reformule ni n'invente l'histoire familiale, l'année de reprise ou le volume annuel.",
      "Tu peux retenir moins de 15 candidats lorsque les preuves de pertinence manquent.",
      "La note 8-10 requiert une adéquation commerciale claire; 6-7 = piste plausible.",
      "N'invente aucune donnée d'entreprise, aucune analyse de site ni aucun chiffre de marché.",
      "Retourne UNIQUEMENT un objet JSON valide de forme:",
      '{"shortlist":[{"id":"uuid fourni","score":8,"reason":"faits commerciaux issus des champs fournis"}],',
      '"summary_markdown":"analyse en français, 2-4 paragraphes, sans statistiques invérifiables"}',
      "Les identifiants de shortlist DOIVENT être ceux du tableau fourni. Ne renvoie ni coordonnées ni nom inventés.",
      "Dans les raisons, ne cite que des informations figurant dans les champs transmis."
    ].join("\n");
    const userPrompt=[
      "DOMAINE (champs opérationnels Supabase)",JSON.stringify(profileSummary),
      "VINS ACTIFS (fiches commerciales; ne déduis pas de volume ni de production totale)",JSON.stringify((wines??[]).map(w=>({
        name:w.name,color:w.color,appellation:w.appellation,grapes:w.grapes,
        exw_price_eur:w.exw_price_eur,organic:w.organic,is_natural:w.is_natural
      }))),
      "MARCHÉ",marketName,
      "ENTREPRISES CANDIDATES ("+compactContacts.length+")",JSON.stringify(compactContacts),
      "Choisis uniquement des IDs de cette liste, évite les profils insuffisamment pertinents."
    ].join("\n\n");

    const llmText = await callAnthropic(systemPrompt, userPrompt);
    const parsed = extractJson(llmText);

    if (!Array.isArray(parsed?.shortlist)) throw new Error("LLM response missing shortlist");
    const candidateById=new Map(selected.map(c=>[c.id,c]));
    const shortlist:any[]=[];const usedCompanies=new Set<string>();const usedDomains=new Set<string>();
    for(const raw of parsed.shortlist){
      const c=candidateById.get(raw?.id);
      if(!c)continue; // Reject hallucinated contact ids.
      const score=Math.max(1,Math.min(10,Math.round(Number(raw.score)||0)));
      if(score<6)continue;
      const identity=companyKey(c.company_name),host=websiteKey(c.website_url);
      if(usedCompanies.has(identity)||(host&&usedDomains.has(host)))continue;
      const factualReason=evidenceReason(c,c.enrichment,profile,wines??[]);
      if(!factualReason)continue; // No verifiable business signal.
      shortlist.push({
        buyer_contact_id:c.id,company_name:c.company_name,
        email:/invalid|bounced|undeliverable/i.test(String(c.email_status??""))?null:c.email,
        phone:c.phone,website_url:c.website_url,
        score,reason:factualReason
      });
      usedCompanies.add(identity);if(host)usedDomains.add(host);
      if(shortlist.length>=15)break;
    }
    if(!shortlist.length)throw new Error("No commercially supported shortlist candidates");

    // Enrich the *selected* shortlist with Supabase facts before persisting.
    // This payload is a commercial snapshot for the results table and exports;
    // each buyer_contact_id also allows the UI to retrieve the full live profile.
    const chosenIds = shortlist.map((item:any)=>item.buyer_contact_id).filter(Boolean);
    const [{data: people,error: peopleErr},{data: extraEmails,error: emailsErr}] = await Promise.all([
      supabase.from("buyer_contact_enrichment_people")
        .select("buyer_contact_id,full_name,job_title,business_email,business_phone,linkedin_url")
        .in("buyer_contact_id",chosenIds).limit(1000),
      supabase.from("buyer_contact_enrichment_emails")
        .select("buyer_contact_id,email,email_purpose")
        .in("buyer_contact_id",chosenIds).limit(1000)
    ]);
    if(peopleErr)throw peopleErr;
    if(emailsErr)throw emailsErr;
    const peopleByContact=new Map<string,any[]>(), emailsByContact=new Map<string,any[]>();
    for(const person of people??[]){
      const list=peopleByContact.get(person.buyer_contact_id)||[];
      list.push(person);peopleByContact.set(person.buyer_contact_id,list);
    }
    for(const email of extraEmails??[]){
      const list=emailsByContact.get(email.buyer_contact_id)||[];
      list.push(email);emailsByContact.set(email.buyer_contact_id,list);
    }
    const priorityPerson=(p:any)=>{
      const role=normalizeText(p.job_title);
      let score=0;
      if(/achat|acheteur|purchas|buyer|einkauf|procurement|import/.test(role))score+=8;
      if(/direct|gerant|owner|propriet|founder|fondateur|manag|leitung|geschaft|commercial|sales/.test(role))score+=4;
      if(p.business_email)score+=3;
      return score;
    };
    const existing=new Map(selected.map((c:any)=>[c.id,c]));
    for(const item of shortlist){
      const c:any=existing.get(item.buyer_contact_id);
      const e:any=c?.enrichment||null;
      const peopleList=(peopleByContact.get(item.buyer_contact_id)||[])
        .filter((p:any)=>p.full_name?.trim()).sort((a:any,b:any)=>priorityPerson(b)-priorityPerson(a))
        .slice(0,8).map((p:any)=>({
          full_name:p.full_name,job_title:p.job_title||null,
          business_email:p.business_email||null,business_phone:p.business_phone||null,
          linkedin_url:p.linkedin_url||null
        }));
      const extraList=Array.from(new Set((emailsByContact.get(item.buyer_contact_id)||[])
        .map((m:any)=>String(m.email||"").trim()).filter(Boolean)))
        .filter((email:string)=>email.toLowerCase()!==String(item.email||"").toLowerCase()).slice(0,15);
      Object.assign(item,{
        city:c?.city||null,country:c?.country||null,
        company_type:e?.company_type||null,
        description_fr:e?.description_fr||null,description_en:e?.description_en||null,
        wine_origins:e?.wine_origins||[],wine_regions:e?.wine_regions||[],
        wine_appellations:e?.wine_appellations||[],
        wine_styles:e?.wine_styles||[],wine_specialties:e?.wine_specialties||[],
        distribution_channels:e?.distribution_channels||[],
        direct_import_status:e?.direct_import_status||null,
        source_urls:(e?.source_urls||[]).slice(0,8),
        decision_makers:peopleList,
        preferred_contact:peopleList[0]||null,
        additional_emails:extraList
      });
    }

    const resultJson={shortlist,selection_metadata:{engine_version:"enriched_v2",market_contacts:contacts.length,
      enrichment_available:enriched.size,candidates_compared:selected.length,excluded_history:historic.names.size}};

    const summary = String(parsed.summary_markdown ?? "");
    if(dry_run)return json({ok:true,dry_run:true,shortlist:resultJson.shortlist,summary});
    const now = new Date().toISOString();
    const {error: saveErr}=await supabase.from("sourcing_requests").update({
      status: "validated",
      result_json: resultJson,
      result_summary: summary,
      processing_completed_at: now,
      validated_at: now,
    }).eq("id", sourcing_request_id);
    if(saveErr)throw saveErr;

    // Trigger branded notification email (best-effort, never block the flow)
    try {
      const { error: notifyErr } = await supabase.functions.invoke(
        "notify-sourcing-validated",
        { body: { requestId: sourcing_request_id } },
      );
      if (notifyErr) console.error("notify-sourcing-validated invoke error", notifyErr);
    } catch (e) {
      console.error("notify-sourcing-validated invoke threw", e);
    }

    return json({ ok: true, shortlist_count: shortlist.length, engine_version:"enriched_v2" });
  } catch (err: any) {
    console.error("process-sourcing-request error", err);
    await refundCredit();
    if(!dry_run) await supabase.from("sourcing_requests").update({
      status: "pending",
      error_message: String(err?.message ?? err),
      processing_started_at: null,
    }).eq("id", sourcing_request_id);
    return json({ error: String(err?.message ?? err) }, 500);
  }
});
