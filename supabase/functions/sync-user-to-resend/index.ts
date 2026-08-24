import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AUDIENCE_ID = "470ca467-0abf-4a5a-8453-722732a7e4a8";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

async function addContact(email: string, firstName: string | null) {
  const res = await fetch(
    `https://api.resend.com/audiences/${AUDIENCE_ID}/contacts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        first_name: firstName ?? "",
        subscribed: true,
      }),
    },
  );
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function triggerAddedToAudienceEvent(email: string) {
  const res = await fetch("https://api.resend.com/events/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event: "contact.added_to_audience",
      email,
    }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
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

    const payload = await req.json().catch(() => ({}));
    // Accept either a Postgres webhook payload or a direct { user_id } / { email } call
    let email: string | null = payload?.email ?? payload?.record?.email ?? null;
    let userId: string | null =
      payload?.user_id ?? payload?.record?.id ?? payload?.record?.user_id ?? null;

    if (!email && userId) {
      const { data: userRes, error: userErr } =
        await supabase.auth.admin.getUserById(userId);
      if (userErr) throw userErr;
      email = userRes.user?.email ?? null;
    }

    if (!email) {
      return new Response(
        JSON.stringify({ error: "No email or user_id provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Lookup first name from profiles via contact_name
    let firstName: string | null = null;
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("contact_name")
        .eq("user_id", userId)
        .maybeSingle();
      const cn = profile?.contact_name?.trim();
      if (cn) firstName = cn.split(/\s+/)[0];
    }

    const result = await addContact(email, firstName);
    console.log("sync-user-to-resend", email, result.status, result.data);

    if (result.ok) {
      const eventResult = await triggerAddedToAudienceEvent(email);
      console.log("sync-user-to-resend:event", email, eventResult.status, eventResult.data);
    }



    return new Response(JSON.stringify({ success: result.ok, ...result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("sync-user-to-resend error", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});