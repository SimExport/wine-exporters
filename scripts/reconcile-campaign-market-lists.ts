// Administrative tool; default is read-only. NEVER creates or sends email campaigns.
// --apply --confirm=WineExporters requires separate authorisation and a private contacts JSON.
import { readFile, writeFile } from 'node:fs/promises';
import { CAMPAIGN_MARKETS, MIN_CAMPAIGN_EMAILS, CAMPAIGN_EMAIL_RE, normalizeCampaignMarket, campaignCandidateEmails, type CampaignMarket } from '../supabase/functions/_shared/campaign-markets';

export interface ReconciliationContact { country: string; email: string | null; email_status?: string | null; company_name?: string | null }
export function collectMarketContacts(rows: readonly ReconciliationContact[], value: string): Map<string, string | null> {
  const emails = new Map<string, string | null>();
  for (const row of rows) {
    if (normalizeCampaignMarket(row.country) !== normalizeCampaignMarket(value)) continue;
    for (const email of campaignCandidateEmails(row.email, row.email_status)) {
      if (!emails.has(email)) emails.set(email, row.company_name?.trim() || null);
    }
  }
  return emails;
}
export function contactImportDecision(existing: { emailBlacklisted?: unknown; attributes?: Record<string, unknown> } | null, companyName: string | null) {
  if (existing && existing.emailBlacklisted !== false) return { action: 'skip' as const, attributes: {} };
  const attributes = companyName && !existing?.attributes?.COMPANY_NAME ? { COMPANY_NAME: companyName } : {};
  return { action: existing ? 'add' as const : 'create' as const, attributes };
}

export async function auditMarketList(m: CampaignMarket, request: (path: string) => Promise<unknown>) {
  if (!m.listIds.length) return { listIds: [], nonBlockedContacts: 0, state: 'missing_list' };
  const emails = new Set<string>();
  for (const id of m.listIds) {
    const info = await request(`/contacts/lists/${id}`) as { id?: number; name?: string };
    if (info.id !== id || normalizeCampaignMarket(info.name) !== normalizeCampaignMarket(m.value)) throw new Error(`List identity mismatch (${id})`);
    const before = emails.size;
    for (let offset = 0; ; offset += 500) {
      const page = await request(`/contacts/lists/${id}/contacts?limit=500&offset=${offset}`) as { contacts?: { email?: string; emailBlacklisted?: boolean }[] };
      if (!Array.isArray(page.contacts)) throw new Error(`Invalid list response (${id})`);
      for (const c of page.contacts) if (c.emailBlacklisted === false && typeof c.email === 'string' && CAMPAIGN_EMAIL_RE.test(c.email)) emails.add(c.email.toLowerCase());
      if (page.contacts.length < 500) break;
    }
    // Every constituent list must actually have sendable contacts.
    if (emails.size === before && m.listIds.length === 1) return { listIds: [...m.listIds], nonBlockedContacts: 0, state: 'blocked_or_empty' };
  }
  return { listIds: [...m.listIds], nonBlockedContacts: emails.size, state: emails.size > 0 ? 'checked' : 'blocked_or_empty' };
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  if (apply && !args.includes('--confirm=WineExporters')) throw new Error('Explicit WineExporters import confirmation required');
  const key = process.env.BREVO_API_KEY;
  if (!key || key.startsWith('lovc_')) throw new Error('Existing direct Brevo server credential required; never put it in the browser');
  const request = async (path: string, method = 'GET', body?: unknown): Promise<unknown> => {
    if (method !== 'GET' && !apply) throw new Error('Read-only mode refused a write');
    // Provider paths never include emailCampaigns, smtp or sendNow.
    if (!path.startsWith('/contacts')) throw new Error('Only contact/list operations are allowed');
    const response = await fetch(`https://api.brevo.com/v3${path}`, {
      method, headers: { 'api-key': key, accept: 'application/json', 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(30_000),
    });
    if (response.status === 404 && /^\/contacts\/[^/]+$/.test(path) && !path.startsWith('/contacts/lists')) return null;
    if (!response.ok) throw new Error(`Brevo HTTP ${response.status}`); // Do not print paths/bodies containing private addresses.
    return response.status === 204 ? {} : await response.json();
  };
  const input = args.find(a => a.startsWith('--contacts='))?.slice('--contacts='.length);
  const selectedCodes = args.find(a => a.startsWith('--markets='))?.slice('--markets='.length).split(',');
  const rows: ReconciliationContact[] = input ? JSON.parse(await readFile(input, 'utf8')) : [];
  if (!Array.isArray(rows) || rows.some(r => !r || typeof r.country !== 'string' || (r.email !== null && typeof r.email !== 'string'))) throw new Error('Invalid private contact input');
  if (apply && (!input || !selectedCodes?.length)) throw new Error('An explicit private contacts input and --markets=ISO,ISO allowlist are required');
  const mappings: Record<string, number[]> = {};
  const readiness: Record<string, { listIds: number[]; nonBlockedContacts: number }> = {};
  for (const m of CAMPAIGN_MARKETS) {
    let current = m;
    const contacts = collectMarketContacts(rows, m.value);
    if (apply && selectedCodes?.includes(m.code)) {
      if (!contacts.size || (!m.existing && contacts.size < MIN_CAMPAIGN_EMAILS)) throw new Error(`Insufficient candidate addresses for ${m.code}`);
      if (!m.listIds.length) {
        // Refuse duplicates; do not substitute similarly named source/customer lists.
        let found = false;
        for (let offset = 0; ; offset += 50) {
          const p = await request(`/contacts/lists?limit=50&offset=${offset}`) as { lists?: { name?: string }[] };
          if (!Array.isArray(p.lists)) throw new Error('Invalid list inventory');
          if (p.lists.some(l => normalizeCampaignMarket(l.name) === normalizeCampaignMarket(m.value))) found = true;
          if (p.lists.length < 50) break;
        }
        if (found) throw new Error(`Existing country list requires manual mapping review for ${m.code}`);
        const created = await request('/contacts/lists', 'POST', { name: m.value, folderId: 178 }) as { id?: number };
        if (!Number.isSafeInteger(created.id) || !created.id) throw new Error('List creation not confirmed; reconcile before retry');
        current = { ...m, listIds: [created.id] };
      }
      for (const [email, companyName] of contacts) {
        const existing = await request(`/contacts/${encodeURIComponent(email)}`) as { emailBlacklisted?: boolean; attributes?: Record<string, unknown>; listIds?: number[] } | null;
        const decision = contactImportDecision(existing, companyName);
        if (decision.action === 'skip') continue;
        if (decision.action === 'create') {
          await request('/contacts', 'POST', { email, listIds: [...current.listIds], attributes: decision.attributes, updateEnabled: false });
        } else {
          // List membership only; no blacklist flags, no clearing/overwriting existing attributes.
          for (const id of current.listIds) if (!existing?.listIds?.includes(id)) await request(`/contacts/lists/${id}/contacts/add`, 'POST', { emails: [email] });
        }
      }
      mappings[m.code] = [...current.listIds];
    }
    try {
      const audit = await auditMarketList(current, path => request(path));
      readiness[m.code] = { listIds: audit.listIds, nonBlockedContacts: audit.nonBlockedContacts };
      console.log(JSON.stringify({ code: m.code, candidateEmails: input ? contacts.size : undefined, ...audit }));
    } catch {
      readiness[m.code] = { listIds: [...current.listIds], nonBlockedContacts: 0 };
      console.log(JSON.stringify({ code: m.code, state: 'check_failed', nonBlockedContacts: 0 }));
    }
  }
  // Safe local output contains only checked IDs/counts, never any contact data or credentials.
  if (args.includes('--write-readiness')) {
    if (Object.entries(mappings).some(([code, ids]) => CAMPAIGN_MARKETS.find(m => m.code === code)?.listIds.join(',') !== ids.join(','))) throw new Error('Review the new IDs in the catalogue before writing readiness');
    await writeFile(new URL('../supabase/functions/_shared/campaign-market-readiness.ts', import.meta.url),
      `// Generated by read-only Brevo audit. No addresses or credentials. Senders recheck before every send.\nexport interface MarketReadiness { listIds: number[]; nonBlockedContacts: number }\nexport const MARKET_READINESS_CHECKED_AT = ${JSON.stringify(new Date().toISOString())};\nexport const CAMPAIGN_MARKET_READINESS: Record<string, MarketReadiness> = ${JSON.stringify(readiness, null, 2)};\n`);
  }
  if (Object.keys(mappings).length) console.log(JSON.stringify({ reviewedMappingRequired: mappings }));
}
if (import.meta.main) main().catch(() => { console.error('Reconciliation stopped; inspect the last aggregate result. No automatic retry.'); process.exitCode = 1; });