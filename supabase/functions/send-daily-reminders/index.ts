import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Fetch leads with remind_at <= now() and not yet notified today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString()

  const { data: dueLeads, error } = await supabaseAdmin
    .from('leads')
    .select(`
      id, first_name, last_name, company_name, remind_at, remind_note,
      campaigns!inner(name, user_id)
    `)
    .lte('remind_at', new Date().toISOString())
    .not('remind_at', 'is', null)

  if (error) {
    console.error('Error fetching due leads:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!dueLeads || dueLeads.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Group by user_id
  const byUser = new Map<string, typeof dueLeads>()
  for (const lead of dueLeads) {
    const campaign = Array.isArray(lead.campaigns) ? lead.campaigns[0] : lead.campaigns
    const userId = campaign?.user_id
    if (!userId) continue
    if (!byUser.has(userId)) byUser.set(userId, [])
    byUser.get(userId)!.push(lead)
  }

  let sent = 0
  for (const [userId, leads] of byUser.entries()) {
    // Get user email
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId)
    const email = userData?.user?.email
    if (!email) continue

    const rows = leads
      .map((l) => {
        const name = l.company_name || `${l.first_name || ''} ${l.last_name || ''}`.trim() || 'Prospect'
        const campaign = Array.isArray(l.campaigns) ? l.campaigns[0] : l.campaigns
        const note = l.remind_note ? `<br><small style="color:#888">${l.remind_note}</small>` : ''
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${campaign?.name || '-'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${new Date(l.remind_at!).toLocaleDateString('fr-FR')}${note}</td>
        </tr>`
      })
      .join('')

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1a1a2e">🔔 Rappels du jour — ExportVins</h2>
        <p>Vous avez <strong>${leads.length} prospect(s)</strong> à relancer aujourd'hui :</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr style="background:#f5f5f5">
              <th style="padding:8px 12px;text-align:left">Prospect</th>
              <th style="padding:8px 12px;text-align:left">Campagne</th>
              <th style="padding:8px 12px;text-align:left">Rappel</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin-top:24px">
          <a href="https://wine-exporters.lovable.app/prospects" style="background:#7c3aed;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">
            Voir mes prospects →
          </a>
        </p>
        <p style="color:#888;font-size:12px;margin-top:32px">
          ExportVins · Vous recevez cet email car vous avez des rappels configurés.
        </p>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ExportVins <rappels@exportvins.com>',
        to: [email],
        subject: `🔔 ${leads.length} rappel(s) de prospection aujourd'hui`,
        html,
      }),
    })

    if (res.ok) {
      sent++
      // Clear remind_at for sent leads so we don't re-notify
      await supabaseAdmin
        .from('leads')
        .update({ remind_at: null, remind_note: null })
        .in('id', leads.map((l) => l.id))
    } else {
      const err = await res.text()
      console.error(`Resend error for ${email}:`, err)
    }
  }

  return new Response(JSON.stringify({ sent }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
