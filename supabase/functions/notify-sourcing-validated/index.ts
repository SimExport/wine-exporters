import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  requestId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requestId }: Payload = await req.json();
    if (!requestId) throw new Error("requestId required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: request, error } = await admin
      .from("sourcing_requests")
      .select("id, user_id, target_market")
      .eq("id", requestId)
      .single();
    if (error || !request) throw error || new Error("Request not found");

    const { data: userData, error: userErr } = await admin.auth.admin.getUserById(request.user_id);
    if (userErr || !userData?.user?.email) throw userErr || new Error("User email not found");
    const userEmail = userData.user.email;

    const appUrl = `https://wine-exporters.com/recherches`;

    const html = `
      <div style="font-family: Arial, sans-serif; background-color: #f5f1ee; padding: 32px 16px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(89,25,31,0.08);">
          <div style="background-color: #59191F; padding: 24px 32px; text-align: center;">
            <div style="color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">WineExporters</div>
            <div style="color: #e8d4d6; font-size: 12px; margin-top: 4px;">by ExportVins</div>
          </div>
          <div style="padding: 32px;">
            <h1 style="color: #59191F; font-size: 22px; margin: 0 0 16px;">Votre recherche sur-mesure est prête</h1>
            <p style="color: #333333; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
              Bonne nouvelle ! Notre équipe a finalisé votre recherche d'importateurs pour le marché
              <strong style="color: #59191F;">${request.target_market}</strong>.
            </p>
            <p style="color: #333333; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">
              Vous pouvez dès maintenant consulter et télécharger la liste des contacts identifiés depuis votre espace.
            </p>
            <p style="margin: 0 0 32px; text-align: center;">
              <a href="${appUrl}" style="background-color: #59191F; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 15px;">
                Voir mes résultats
              </a>
            </p>
            <p style="color: #888888; font-size: 12px; margin: 0; border-top: 1px solid #eeeeee; padding-top: 20px;">
              — L'équipe WineExporters
            </p>
          </div>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: "WineExporters <notifications@exportvins.fr>",
      to: [userEmail],
      bcc: ["simon@exportvins.fr"],
      subject: `Votre recherche sur-mesure (${request.target_market}) est prête sur WineExporters`,
      html,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("notify-sourcing-validated error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);