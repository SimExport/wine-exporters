import { supabase } from '@/integrations/supabase/client'

const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
const toCsv = (cols: string[], rows: Record<string, unknown>[]) =>
  '\uFEFF' + [cols.join(';'), ...rows.map((r) => cols.map((c) => q(r[c])).join(';'))].join('\r\n')
const download = (name: string, csv: string) => {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const el = document.createElement('a'); el.href = url; el.download = name; el.click(); URL.revokeObjectURL(url)
}

/** Full export of the user's CRM: one prospects file (all notes kept in one column) + one file with one row per note. */
export async function exportFullCrm(userId: string) {
  const { data: leads } = await supabase.from('leads')
    .select('id, company_name, first_name, last_name, email, phone, website_url, address_line1, address_line2, postal_code, city, country, importer_description, relevance_reason, status, prospect_status, estimated_amount, order_won, order_amount, order_details, lost_reason, samples_sent_at, next_action, next_action_at, remind_at, remind_note, owner_notes, mission_name, created_at, last_activity_at, pipeline_stages(name), campaigns!inner(user_id, name)')
    .eq('campaigns.user_id', userId).limit(5000)
  const list = (leads || []) as any[]
  const ids = list.map((l) => l.id)
  const notes: any[] = []; const samples: any[] = []
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200)
    const [n, s] = await Promise.all([
      supabase.from('prospect_notes').select('lead_id, body, created_at').in('lead_id', chunk).order('created_at'),
      supabase.from('sample_items').select('lead_id, quantity, comment, wines(name)').in('lead_id', chunk),
    ])
    notes.push(...(n.data || [])); samples.push(...(s.data || []))
  }
  const byLead = (arr: any[]) => arr.reduce((m, x) => ((m[x.lead_id] ||= []).push(x), m), {} as Record<string, any[]>)
  const nb = byLead(notes), sb = byLead(samples)
  const rows = list.map((l) => ({
    ...l,
    stage: l.pipeline_stages?.name ?? '',
    campaign: l.campaigns?.name ?? '',
    samples: (sb[l.id] || []).map((s: any) => `${s.wines?.name ?? '?'} x${s.quantity}${s.comment ? ` (${s.comment})` : ''}`).join('\n'),
    notes: (nb[l.id] || []).map((n: any) => `[${n.created_at.slice(0, 10)}] ${n.body}`).join('\n\n'),
  }))
  const cols = ['company_name','first_name','last_name','email','phone','website_url','address_line1','address_line2','postal_code','city','country','importer_description','relevance_reason','mission_name','campaign','stage','status','prospect_status','estimated_amount','order_won','order_amount','order_details','lost_reason','samples','samples_sent_at','next_action','next_action_at','remind_at','remind_note','owner_notes','notes','created_at','last_activity_at']
  download('prospects-wineexporters.csv', toCsv(cols, rows))
  const company = Object.fromEntries(list.map((l) => [l.id, l.company_name || l.email || '']))
  const noteRows = notes.map((n) => ({ company: company[n.lead_id], date: n.created_at, note: n.body }))
  if (noteRows.length) download('notes-wineexporters.csv', toCsv(['company','date','note'], noteRows))
}
