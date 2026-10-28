import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
const validEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  try {
    const len = Number(req.headers.get("content-length") || 0);
    if (len > 25000) return json(413, { error: "too_large" });
    const body = await req.json();
    if (typeof body !== "object" || !body || Array.isArray(body)) return json(400, { error: "invalid_payload" });
    // Lightweight bot trap. Every accepted request is still queued for admin review.
    if (clean(body.website_confirmation, 200)) return json(200, { success: true, pending_review: true });

    const full_name = clean(body.full_name, 120);
    const company_name = clean(body.company_name, 200);
    const country = clean(body.country, 100);
    const email = clean(body.email, 255).toLowerCase();
    const phone = clean(body.phone, 40) || null;
    const sample_address = clean(body.sample_address, 400) || null;
    const wine_styles = clean(body.wine_styles, 280);
    const origins = clean(body.origins, 350);
    const volume = clean(body.volume, 140) || null;
    const price_range = clean(body.price_range, 140) || null;
    const requirements = clean(body.requirements, 2000) || null;
    const consent_publish = body.consent_publish === true;
    const consent_direct_contact = body.consent_direct_contact === true;
    const locale = body.locale === "fr" ? "fr" : "en";
    if (!full_name || !company_name || !country || !email || !wine_styles || !origins)
      return json(400, { error: "required_fields_missing" });
    if (!validEmail(email)) return json(400, { error: "invalid_email" });
    if (!consent_publish) return json(400, { error: "publication_consent_required" });
    if ([full_name,company_name,country,email,wine_styles,origins].some(s=>s.includes("\n") || s.includes("\r")))
      return json(400, { error: "invalid_field" });
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return json(500, { error: "service_unavailable" });
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    // Prevent rapid accidental resubmissions / basic abuse without exposing any private rows.
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentCount, error: recentErr } = await supabase
      .from("importer_opportunity_submissions")
      .select("id", { head: true, count: "exact" })
      .eq("email", email).gte("created_at", fiveMinutesAgo);
    const { count: dailyCount, error: dailyErr } = await supabase
      .from("importer_opportunity_submissions")
      .select("id", { head: true, count: "exact" })
      .eq("email", email).gte("created_at", dayAgo);
    if (recentErr || dailyErr) {
      console.error("Submission rate-check failed", recentErr || dailyErr);
      return json(503, { error: "temporarily_unavailable" });
    }
    if ((recentCount ?? 0) >= 1 || (dailyCount ?? 0) >= 5)
      return json(429, { error: "too_many_requests" });

    const { error } = await supabase.from("importer_opportunity_submissions").insert({
      full_name, company_name, country, email, phone, sample_address,
      wine_styles, origins, volume, price_range, requirements,
      consent_publish, consent_direct_contact, locale,
      status: "pending", source: "native_opportunities_form",
    });
    if (error) {
      console.error("Submission save failed", error);
      return json(503, { error: "temporarily_unavailable" });
    }
    return json(200, { success: true, pending_review: true });
  } catch (err) {
    console.error("Submission error", err);
    return json(400, { error: "invalid_request" });
  }
});
