// Lecture publique assainie d'une analyse de marché prospect.
// Le frontend ne fait jamais de SELECT sur prospect_market_searches :
// cette fonction ne renvoie que les champs nécessaires à l'affichage,
// sans email ni téléphone d'importateur.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let id: string | undefined;
  try {
    const body = await req.json();
    id = body?.prospect_market_search_id;
  } catch (_) {}
  if (!id || !UUID_RE.test(id)) return json({ error: "invalid id" }, 400);

  const { data: row, error } = await supabase
    .from("prospect_market_searches")
    .select(
      "id, status, winery_name, winery_location, export_price_range, target_country, result_json",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) return json({ error: "lookup failed" }, 500);
  if (!row) return json({ error: "not found" }, 404);

  const base = {
    status: row.status,
    winery_name: row.winery_name,
    winery_location: row.winery_location,
    export_price_range: row.export_price_range,
    target_country: row.target_country,
  };

  if (row.status !== "completed") return json(base);

  const result = (row.result_json ?? {}) as Record<string, unknown>;
  const shortlist = Array.isArray(result.shortlist) ? result.shortlist : [];

  return json({
    ...base,
    // Whitelist explicite : aucun email, téléphone ou identifiant interne.
    shortlist: shortlist.map((item: any) => ({
      company_name: item?.company_name ?? null,
      city: item?.city ?? null,
      country: item?.country ?? null,
      website_url: item?.website_url ?? null,
      score: typeof item?.score === "number" ? item.score : null,
      reason: item?.reason ?? null,
    })),
    market_summary: typeof result.market_summary === "string" ? result.market_summary : null,
    recommended_approach: Array.isArray(result.recommended_approach)
      ? result.recommended_approach.filter((r: unknown) => typeof r === "string")
      : [],
  });
});
