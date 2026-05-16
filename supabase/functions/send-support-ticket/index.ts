import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  ticketId: string;
  userEmail: string;
  category: string;
  subject: string;
  message: string;
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { ticketId, userEmail, category, subject, message }: Payload = await req.json();

    if (!ticketId || !userEmail || !category || !subject || !message) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7c3aed;">🛟 Nouveau ticket support</h1>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>👤 Utilisateur :</strong> ${escape(userEmail)}</p>
          <p><strong>🏷️ Catégorie :</strong> ${escape(category)}</p>
          <p><strong>📌 Sujet :</strong> ${escape(subject)}</p>
          <p><strong>🆔 Ticket :</strong> ${escape(ticketId)}</p>
        </div>
        <div style="background-color: #fff; border-left: 3px solid #7c3aed; padding: 12px 16px;">
          <p style="white-space: pre-wrap; margin: 0;">${escape(message)}</p>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: "WineExporters Support <notifications@resend.dev>",
      to: ["simon@exportvins.fr"],
      reply_to: userEmail,
      subject: `🛟 [${category}] ${subject}`,
      html,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("send-support-ticket error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});