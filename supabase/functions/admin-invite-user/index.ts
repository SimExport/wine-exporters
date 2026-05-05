import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { email, redirectTo, mode } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "missing_email" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const sendMagicLink = async () => {
      return await admin.auth.admin.generateLink({
        type: "magiclink",
        email: cleanEmail,
        options: { redirectTo: redirectTo || undefined },
      } as any);
    };

    let data: any;
    let error: any;

    if (mode === "resend") {
      const res = await sendMagicLink();
      data = res.data;
      error = res.error;
    } else {
      const res = await admin.auth.admin.inviteUserByEmail(cleanEmail, {
        redirectTo: redirectTo || undefined,
      });
      data = res.data;
      error = res.error;
      if (error && (error as any).code === "email_exists") {
        const res2 = await sendMagicLink();
        data = res2.data;
        error = res2.error;
      }
    }

    if (error) {
      console.error("invite error:", error);
      const code = (error as any).code;
      const friendly = code === "email_exists"
        ? "Cet email est déjà enregistré."
        : error.message;
      await admin.from("admin_invitations").insert({
        email: cleanEmail,
        status: "failed",
        error_message: friendly,
        invited_by: userData.user.id,
      });
      return new Response(JSON.stringify({ error: friendly, code }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    await admin.from("admin_invitations").insert({
      email: cleanEmail,
      status: "sent",
      invited_user_id: data.user?.id ?? null,
      invited_by: userData.user.id,
    });

    return new Response(JSON.stringify({ success: true, user: data.user }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    console.error("admin-invite-user error:", e);
    return new Response(JSON.stringify({ error: e?.message || "server_error" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});