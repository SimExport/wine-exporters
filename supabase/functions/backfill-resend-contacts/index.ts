import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AUDIENCE_ID = "470ca467-0abf-4a5a-8453-722732a7e4a8";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

async function addContact(email: string, firstName: string) {
  const res = await fetch(
    `https://api.resend.com/audiences/${AUDIENCE_ID}/contacts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, first_name: firstName, subscribed: true }),
    },
  );
  return { ok: res.ok, status: res.status };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth: admin JWT, service role key, or one-shot backfill secret
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const backfillSecret = req.headers.get("x-backfill-secret") ?? "";
    let authorized =
      (!!token && token === serviceKey) ||
      backfillSecret === "wineexporters-backfill-2026";
    if (!authorized && token) {
      const { data: userData } = await supabase.auth.getUser(token);
      const callerId = userData?.user?.id;
      if (callerId) {
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", callerId)
          .eq("role", "admin")
          .maybeSingle();
        if (roleRow) authorized = true;
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all profiles
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("user_id, contact_name");
    if (pErr) throw pErr;

    const results: Array<{ email: string; status: number; ok: boolean }> = [];
    let page = 1;
    const perPage = 1000;
    const usersByEmail = new Map<string, { id: string; email: string }>();

    // List all auth users (paginated)
    while (true) {
      const { data: list, error } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) throw error;
      for (const u of list.users) {
        if (u.email) usersByEmail.set(u.id, { id: u.id, email: u.email });
      }
      if (list.users.length < perPage) break;
      page++;
    }

    const profileById = new Map(
      (profiles ?? []).map((p) => [p.user_id, p.contact_name ?? ""]),
    );

    for (const u of usersByEmail.values()) {
      const cn = (profileById.get(u.id) ?? "").trim();
      const firstName = cn ? cn.split(/\s+/)[0] : "";
      try {
        const r = await addContact(u.email, firstName);
        results.push({ email: u.email, status: r.status, ok: r.ok });
      } catch (e) {
        results.push({ email: u.email, status: 0, ok: false });
      }
      // Light throttle
      await new Promise((res) => setTimeout(res, 60));
    }

    const synced = results.filter((r) => r.ok).length;
    return new Response(
      JSON.stringify({ total: results.length, synced, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("backfill-resend-contacts error", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});