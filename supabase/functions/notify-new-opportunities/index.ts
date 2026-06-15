import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SENDER = "WineExporters <notifications@exportvins.fr>";
const APP_URL = "https://wine-exporters.com/opportunites";

const subject = "Nouvelles opportunités disponibles sur WineExporters";

const html = `
  <div style="font-family: Arial, sans-serif; background-color: #f5f1ee; padding: 32px 16px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(89,25,31,0.08);">
      <div style="background-color: #59191F; padding: 24px 32px; text-align: center;">
        <div style="color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">WineExporters</div>
        <div style="color: #e8d4d6; font-size: 12px; margin-top: 4px;">by ExportVins</div>
      </div>
      <div style="padding: 32px;">
        <h1 style="color: #59191F; font-size: 22px; margin: 0 0 16px;">🍇 Nouvelles opportunités disponibles</h1>
        <p style="color: #333333; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
          Bonjour,
        </p>
        <p style="color: #333333; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
          De nouvelles opportunités (demandes directes d'importateurs et/ou appels d'offres) viennent d'être publiées sur votre espace WineExporters.
        </p>
        <p style="color: #333333; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">
          Connectez-vous pour les découvrir et ajouter en un clic celles qui vous intéressent à votre CRM.
        </p>
        <p style="margin: 0 0 32px; text-align: center;">
          <a href="${APP_URL}" style="background-color: #59191F; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 15px;">
            Voir les opportunités
          </a>
        </p>
        <p style="color: #888888; font-size: 12px; margin: 0; border-top: 1px solid #eeeeee; padding-top: 20px;">
          — L'équipe WineExporters<br/>
          Pour ne plus recevoir ces notifications, contactez-nous à <a href="mailto:simon@exportvins.fr" style="color:#59191F;">simon@exportvins.fr</a>.
        </p>
      </div>
    </div>
  </div>
`;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) throw new Error("Unauthorized");

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Forbidden: admin only");

    // Collect all user emails (paginated)
    const emails: string[] = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const batch = (data?.users || []).map((u: any) => u.email).filter(Boolean) as string[];
      emails.push(...batch);
      if (!data || data.users.length < perPage) break;
      page++;
      if (page > 50) break; // hard safety
    }

    const unique = Array.from(new Set(emails.map((e) => e.toLowerCase())));
    console.log(`notify-new-opportunities: sending to ${unique.length} recipients`);

    // Send via BCC batches of 100 (Resend recommended cap)
    const chunkSize = 90;
    let sent = 0;
    const errors: string[] = [];
    for (let i = 0; i < unique.length; i += chunkSize) {
      const chunk = unique.slice(i, i + chunkSize);
      const result = await resend.emails.send({
        from: SENDER,
        to: ["notifications@exportvins.fr"],
        bcc: chunk,
        subject,
        html,
      });
      const err = (result as any)?.error;
      if (err) {
        console.error("Resend error chunk", i, err);
        errors.push(JSON.stringify(err));
      } else {
        sent += chunk.length;
      }
    }

    return new Response(JSON.stringify({ success: true, sent, totalRecipients: unique.length, errors }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("notify-new-opportunities error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message?.includes("Forbidden") ? 403 : 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);