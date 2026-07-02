import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function buildHtml(fullName: string, producerName: string, userName: string) {
  const name = escapeHtml(fullName);
  const producer = escapeHtml(producerName);
  const user = escapeHtml(userName || producerName);
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Your interest has been received</title>
  </head>
  <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#ffffff;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#0a0a0a;">
            <tr>
              <td align="center" style="padding-bottom:32px;">
                <div style="display:inline-block;padding:12px 20px;border:1px solid #59191F;border-radius:8px;">
                  <span style="font-size:20px;font-weight:700;letter-spacing:0.5px;color:#ffffff;">Wine<span style="color:#59191F;">Exporters</span></span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background-color:#111111;border:1px solid #1f1f1f;border-radius:12px;padding:40px 32px;">
                <h1 style="margin:0 0 24px 0;font-size:22px;font-weight:600;color:#ffffff;line-height:1.3;">
                  Your interest has been received
                </h1>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#e5e5e5;">
                  Hi ${name},
                </p>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#e5e5e5;">
                  Thank you for your interest. <strong style="color:#ffffff;">${user}</strong> has received your message and will get back to you directly within a few days.
                </p>
                <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#e5e5e5;">
                  In the meantime, don't hesitate to reach out if you have any questions.
                </p>
                <div style="height:1px;background-color:#1f1f1f;margin:24px 0;"></div>
                <p style="margin:0;font-size:15px;line-height:1.6;color:#e5e5e5;">
                  Best regards,<br />
                  <strong style="color:#ffffff;">Simon Lemonnier</strong><br />
                  <span style="color:#a3a3a3;font-size:13px;">Powered by WineExporters</span>
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top:24px;">
                <p style="margin:0;font-size:12px;color:#737373;">
                  Powered by <a href="https://wine-exporters.com" style="color:#59191F;text-decoration:none;font-weight:600;">WineExporters</a> — wine-exporters.com
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return json(500, { error: "RESEND_API_KEY not configured" });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 255) : "";
  const fullName = typeof body?.full_name === "string" ? body.full_name.trim().slice(0, 120) : "";
  const producerName = typeof body?.producer_name === "string" ? body.producer_name.trim().slice(0, 200) : "";
  const userName = typeof body?.user_name === "string" ? body.user_name.trim().slice(0, 200) : producerName;

  if (!email || !isEmail(email) || !fullName || !producerName) {
    return json(400, { error: "Missing or invalid fields" });
  }

  const resend = new Resend(apiKey);
  try {
    const result = await resend.emails.send({
      from: "Simon Lemonnier <simon@exportvins.fr>",
      to: [email],
      subject: `Your interest has been received — ${producerName}`,
      html: buildHtml(fullName, producerName, userName),
    });
    if ((result as any)?.error) {
      console.error("Resend error:", (result as any).error);
      return json(502, { error: "Email provider error", details: (result as any).error });
    }
    return json(200, { ok: true, id: (result as any)?.data?.id ?? null });
  } catch (e: any) {
    console.error("send-interest-confirmation failed:", e);
    return json(500, { error: e?.message ?? "Send failed" });
  }
});