import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "forbidden" }, 403);

    const { email, redirectTo } = await req.json();
    if (!email || typeof email !== "string") return json({ error: "missing_email" }, 400);
    const cleanEmail = email.trim().toLowerCase();
    const target = typeof redirectTo === "string" && redirectTo.startsWith("https://")
      ? redirectTo
      : "https://wine-exporters.com/set-password";

    // Try invite (new user) -> magiclink (existing, unconfirmed) -> recovery (existing, confirmed)
    const types = ["invite", "magiclink", "recovery"] as const;
    let link: string | null = null;
    let usedType: string | null = null;
    let lastError: string | null = null;

    for (const type of types) {
      const { data, error } = await admin.auth.admin.generateLink({
        type,
        email: cleanEmail,
        options: { redirectTo: target },
      } as any);
      if (!error && data?.properties?.action_link) {
        link = data.properties.action_link;
        usedType = type;
        break;
      }
      lastError = error?.message ?? "unknown_error";
    }

    if (!link) {
      console.error("generateLink failed for target user:", lastError);
      return json({ error: lastError || "link_generation_failed" }, 200);
    }

    return json({ success: true, type: usedType, link });
  } catch (e: any) {
    console.error("admin-invite-link error:", e?.message);
    return json({ error: e?.message || "server_error" }, 500);
  }
});
