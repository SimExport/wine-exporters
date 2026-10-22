// Edge Function: generate-campaign-email
// Generates a structured email proposal with Claude, renders it with the fixed
// template and saves it on the draft campaign. Never contacts Brevo, never
// consumes a campaign credit.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  buildAnthropicUserMessage, contentFromClaude, INTEREST_BASE, missingEmailTags,
  renderEmailHtml, STRUCTURED_SYSTEM_PROMPT,
} from "../_shared/campaign-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const COOLDOWN_MS = 20_000;
const MAX_GENERATIONS = 10;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) return json(500, { error: "ANTHROPIC_API_KEY not configured" });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "Missing token" });
  const { data: u, error: uErr } = await admin.auth.getUser(token);
  if (uErr || !u?.user) return json(401, { error: "Invalid token" });
  const callerId = u.user.id;

  let body: any;
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }
  const campaignId = String(body?.campaignId ?? "");
  if (!UUID.test(campaignId)) return json(400, { error: "campaignId must be a UUID" });

  const { data: campaign } = await admin.from("campaigns").select("*").eq("id", campaignId).maybeSingle();
  if (!campaign) return json(404, { error: "Campaign not found" });
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: callerId, _role: "admin" });
  if (campaign.user_id !== callerId && !isAdmin) return json(403, { error: "Forbidden" });
  if (campaign.status !== "draft") return json(409, { error: "Only draft campaigns can be generated" });
  if ((campaign.email_generation_count ?? 0) >= MAX_GENERATIONS) return json(429, { error: "Generation limit reached for this campaign" });
  if (campaign.email_generated_at && Date.now() - new Date(campaign.email_generated_at).getTime() < COOLDOWN_MS) {
    return json(429, { error: "Please wait a few seconds before generating again" });
  }

  // Reserve the generation slot atomically (counts even if Claude fails: paid resource).
  const prevCount = campaign.email_generation_count ?? 0;
  const { data: reserved } = await admin.from("campaigns")
    .update({ email_generated_at: new Date().toISOString(), email_generation_count: prevCount + 1 })
    .eq("id", campaignId).eq("status", "draft").eq("email_generation_count", prevCount).select("id");
  if (!reserved?.length) return json(409, { error: "Another generation is in progress" });

  try {
    const { data: profile } = await admin.from("profiles").select("*").eq("user_id", campaign.user_id).maybeSingle();
    const ids: string[] = Array.isArray(campaign.selected_wines) ? campaign.selected_wines : [];
    const wq = admin.from("wines").select("id,name,color,appellation,exw_price_eur,awards");
    const { data: wines } = ids.length ? await wq.in("id", ids) : await wq.eq("user_id", campaign.user_id).eq("is_active", true);
    const interestUrl = INTEREST_BASE + campaignId;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: AbortSignal.timeout(90_000),
      headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6", max_tokens: 2000, system: STRUCTURED_SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildAnthropicUserMessage({ campaignId, campaign, profile, wines: wines ?? [], interestUrl }) }],
      }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.error(`Anthropic ${resp.status}: ${t.slice(0, 500)}`);
      return json(502, { error: "AI generation failed, please retry", status: resp.status });
    }
    const raw: string = (await resp.json())?.content?.[0]?.text ?? "";
    const jsonText = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    let parsed: any;
    try { parsed = JSON.parse(jsonText); } catch { return json(502, { error: "AI returned invalid content, please retry" }); }

    const domainName = profile?.domain_name || campaign.name;
    const content = contentFromClaude(parsed, domainName);
    const html = renderEmailHtml(content, { campaignId, domainName, address: profile?.location ?? "" });
    const missing = missingEmailTags(html, content.subject, campaignId);
    if (missing.length) return json(502, { error: "Generated email is missing required elements", missing });

    const { error: sErr } = await admin.from("campaigns")
      .update({ email_content: content, message_html: html, subject_selected: content.subject })
      .eq("id", campaignId).eq("status", "draft");
    if (sErr) throw new Error(sErr.message);
    return json(200, { subject: content.subject, content, html, remaining: MAX_GENERATIONS - prevCount - 1 });
  } catch (e: any) {
    console.error("generate-campaign-email failed:", e?.message ?? e);
    const timeout = e?.name === "TimeoutError" || e?.name === "AbortError";
    return json(timeout ? 504 : 500, { error: timeout ? "AI generation timed out, please retry" : (e?.message ?? "Generation failed") });
  }
});
