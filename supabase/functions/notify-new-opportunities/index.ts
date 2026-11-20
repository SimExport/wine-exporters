import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.119.2";
import { corsHeaders } from "npm:@supabase/supabase-js@2.119.2/cors";
import { z } from "npm:zod@3";
import { deliverBatches, providerOutcome, notificationResult, type Batch } from "./delivery.ts";

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

const Body = z.object({
  action: z.enum(['status', 'resume', 'create']).default('status'),
  operation_id: z.string().uuid().optional(),
  confirm_new: z.boolean().optional(),
}).strict();
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { success: false, error: 'Method not allowed' });
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json(503, { success: false, error: 'Configuration serveur indisponible.' });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let authorized = false;
  const readSummary = async () => {
    const { data, error } = await admin.rpc('opportunity_notification_summary');
    if (error) throw new Error('Lecture du suivi indisponible.');
    return data;
  };
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json(401, { success: false, error: 'Unauthorized' });
    const { data: userData, error: userErr } = await admin.auth.getUser(authHeader.slice(7));
    if (userErr || !userData.user) return json(401, { success: false, error: 'Unauthorized' });
    const { data: role, error: roleError } = await admin.from('user_roles').select('role')
      .eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle();
    if (roleError || !role) return json(403, { success: false, error: 'Forbidden: admin only' });
    authorized = true;
    let raw: unknown;
    try { raw = await req.json(); } catch { return json(400, { success: false, error: 'Invalid request' }); }
    const parsed = Body.safeParse(raw);
    if (!parsed.success) return json(400, { success: false, error: 'Invalid request' });
    const input = parsed.data;
    let operation = await readSummary();
    if (input.action === 'status') return json(200, { success: !operation?.failed && !operation?.indeterminate, operation });
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) return json(503, { success: false, operation, error: 'RESEND_API_KEY non configurée.' });
    if (input.action === 'create') {
      if (input.confirm_new !== true || operation?.status === 'active') return json(409, { success: false, operation, error: 'Terminez le lot actif avant un nouvel envoi confirmé.' });
      const emails: string[] = [];
      for (let page = 1; page <= 50; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw new Error('Lecture des destinataires indisponible.');
        emails.push(...data.users.flatMap(u => u.email ? [u.email.trim().toLowerCase()] : []));
        if (data.users.length < 1000) break;
        if (page === 50) throw new Error('Trop de destinataires ; aucun envoi démarré.');
      }
      if (!emails.length) return json(200, { success: false, operation, error: 'Aucun destinataire.' });
      const { error } = await admin.rpc('start_opportunity_notification', { _emails: [...new Set(emails)], _admin: userData.user.id });
      if (error) throw new Error('Création du suivi indisponible.');
      operation = await readSummary();
    } else if (!operation || operation.id !== input.operation_id || operation.status !== 'active') {
      return json(409, { success: false, operation, error: 'Le lot actif a changé. Rechargez le suivi.' });
    }
    if (!operation || operation.blocked || operation.indeterminate > 0) return json(409, {
      success: false, operation, error: operation?.blocked ? 'Préchargement historique requis avant reprise.' : 'Issue incertaine : rapprochez le lot avec Resend avant reprise.',
    });
    const operationId = operation.id;
    await deliverBatches({
      claim: async () => {
        const { data, error } = await admin.rpc('claim_opportunity_notification_batch', { _operation: operationId });
        if (error) throw new Error('Réservation du lot indisponible.');
        return data as Batch | null;
      },
      send: async (batch) => {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': batch.idempotency_key },
          body: JSON.stringify({ from: SENDER, to: ['notifications@exportvins.fr'], bcc: batch.emails, subject, html }),
          signal: AbortSignal.timeout(15000),
        });
        let body: unknown;
        try { body = await response.json(); } catch { return { state: 'indeterminate', error: `Resend HTTP ${response.status}, réponse illisible.` }; }
        return providerOutcome(response.status, body);
      },
      finish: async (batch, outcome) => {
        const { error } = await admin.rpc('finish_opportunity_notification_batch', {
          _batch: batch.id, _state: outcome.state, _resend_id: outcome.resendId ?? null, _error: outcome.error ?? null,
        });
        if (error) throw new Error('Résultat non enregistré ; rapprochement requis avant reprise.');
      },
      pause: () => new Promise(resolve => setTimeout(resolve, 600)),
    });
    operation = await readSummary();
    return json(200, notificationResult(operation));
  } catch (error) {
    console.error('notify-new-opportunities: suivi interrompu');
    if (!authorized) return json(401, { success: false, error: 'Unauthorized' });
    let operation = null;
    try { operation = await readSummary(); } catch { /* Return explicit unavailable state, never zero counters. */ }
    return json(500, { success: false, operation, error: error instanceof Error ? error.message : 'Notification interrompue.' });
  }
};
serve(handler);
