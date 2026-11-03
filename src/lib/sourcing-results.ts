export type CrmAddOutcome = 'added' | 'existing';

/** Run the same single-prospect path sequentially, retaining successes on partial failure. */
export async function addSourcingProspects(
  indices: number[],
  add: (index: number) => Promise<CrmAddOutcome>,
) {
  const result = { added: 0, existing: 0, completed: [] as number[], failed: [] as number[] };
  for (const index of [...new Set(indices)]) {
    try {
      const outcome = await add(index);
      result[outcome] += 1;
      result.completed.push(index);
    } catch {
      result.failed.push(index);
    }
  }
  return result;
}

export function sourcingSelectionIndices(total: number, added: Set<number>, selected?: Set<number>) {
  return Array.from({ length: total }, (_, index) => index)
    .filter(index => !added.has(index) && (!selected || selected.has(index)));
}

/** Improve legacy plain-line summaries for display only; preserve stored content and Markdown. */
export function formatSourcingSummary(summary: string) {
  const lines = summary.replace(/\r\n/g, '\n').split('\n');
  let inCode = false;
  return lines.map((line, index) => {
    const text = line.trim();
    if (text.startsWith('```')) inCode = !inCode;
    if (inCode || !text || /^(?:[#>*|`]|[-+]\s|\d+[.)]\s)/.test(text)) return line;
    // Short standalone labels preceding body text become section headings.
    if (text.length <= 100 && !/[.!?;:]$/.test(text) && lines.slice(index + 1).some(next => next.trim())) {
      return `\n## ${text}\n`;
    }
    return line;
  }).join('\n');
}
// ---------------------------------------------------------------------------
// Shortlist display/export helpers. Every new field is optional: legacy
// shortlists ({company_name,email,phone,website_url,score,reason}) stay valid.
// ---------------------------------------------------------------------------

export interface SourcingPerson {
  full_name?: string | null;
  job_title?: string | null;
  business_email?: string | null;
  business_phone?: string | null;
  linkedin_url?: string | null;
}

export interface SourcingShortlistItem {
  company_name: string;
  email?: string | null;
  phone?: string | null;
  website_url?: string | null;
  website?: string | null;
  score?: number | null;
  reason?: unknown;
  buyer_contact_id?: string | null;
  city?: string | null;
  country?: string | null;
  company_type?: string | null;
  description_fr?: string | null;
  description_en?: string | null;
  wine_origins?: unknown;
  wine_regions?: unknown;
  wine_appellations?: unknown;
  wine_styles?: unknown;
  wine_specialties?: unknown;
  distribution_channels?: unknown;
  direct_import_status?: string | null;
  source_urls?: unknown;
  decision_makers?: unknown;
  preferred_contact?: unknown;
  additional_emails?: unknown;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function text(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

export function list(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(text).filter(Boolean))];
}

/** Real buyer_contacts id only; never derive a fake one. */
export function buyerContactId(item: SourcingShortlistItem): string | null {
  const id = text(item.buyer_contact_id);
  return UUID_RE.test(id) ? id : null;
}

export function scoreOf(item: SourcingShortlistItem): number | null {
  return typeof item.score === 'number' && Number.isFinite(item.score) ? item.score : null;
}

/** Accepts bare domains (e.g. "leons-weinhaus.de"); returns only safe http(s) URLs. */
export function safeWebsiteUrl(value?: string | null): string | null {
  let raw = text(value);
  if (!raw) return null;
  if (!/^[a-z][a-z\d+.-]*:/i.test(raw)) {
    if (raw.startsWith('//')) raw = raw.slice(2);
    if (!/^[\w-]+(\.[\w-]+)+([/:?#].*)?$/.test(raw)) return null;
    raw = `https://${raw}`;
  }
  try {
    const url = new URL(raw);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password && url.hostname.includes('.') ? url.href : null;
  } catch { return null; }
}

export function websiteOf(item: SourcingShortlistItem): string {
  return text(item.website_url) || text(item.website);
}

function person(value: unknown): SourcingPerson | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const p = {
    full_name: text(v.full_name) || null,
    job_title: text(v.job_title) || null,
    business_email: text(v.business_email) || null,
    business_phone: text(v.business_phone) || null,
    linkedin_url: text(v.linkedin_url) || null,
  };
  return p.full_name || p.business_email ? p : null;
}

export function decisionMakers(item: SourcingShortlistItem): SourcingPerson[] {
  return Array.isArray(item.decision_makers) ? item.decision_makers.map(person).filter((p): p is SourcingPerson => !!p) : [];
}

/** Preferred contact first, else first decision maker; null for legacy rows. */
export function primaryPerson(item: SourcingShortlistItem): SourcingPerson | null {
  return person(item.preferred_contact) ?? decisionMakers(item)[0] ?? null;
}

export function portfolioOf(item: SourcingShortlistItem, max = 3): string[] {
  const values = [...list(item.wine_regions), ...list(item.wine_appellations), ...list(item.wine_specialties), ...list(item.wine_origins), ...list(item.wine_styles)];
  return [...new Set(values)].slice(0, max);
}

export function channelsOf(item: SourcingShortlistItem, max = 3): string[] {
  return list(item.distribution_channels).slice(0, max);
}

/** Only an explicit confirmation is shown; partial/review states stay hidden. */
export function hasConfirmedDirectImport(item: SourcingShortlistItem): boolean {
  return text(item.direct_import_status) === 'confirmed';
}

export function reasonOf(item: SourcingShortlistItem): string {
  return text(item.reason);
}

export function descriptionOf(item: SourcingShortlistItem, language: string): string {
  const en = text(item.description_en);
  const fr = text(item.description_fr);
  return language.startsWith('en') ? en || fr : fr || en;
}

/** Object for ImporterProfileSheet; only when a real buyer_contacts id exists. */
export function toProfileContact(item: SourcingShortlistItem, marketLabel: string) {
  const id = buyerContactId(item);
  if (!id) return null;
  return {
    id,
    buyer_contact_id: id,
    company_name: item.company_name,
    country: text(item.country) || marketLabel,
    city: text(item.city) || null,
    email: text(item.email) || null,
    phone: text(item.phone) || null,
    website_url: safeWebsiteUrl(websiteOf(item)),
  };
}

export const EXPORT_HEADERS = [
  'company_name', 'email', 'phone', 'website_url', 'score', 'reason',
  'city', 'country', 'company_type', 'portfolio', 'distribution_channels', 'direct_import',
  'preferred_contact', 'preferred_contact_job_title', 'preferred_contact_email',
  'other_decision_makers', 'additional_emails', 'description', 'sources',
] as const;

export function exportRow(item: SourcingShortlistItem, language: string, directImportLabel: string): string[] {
  const primary = primaryPerson(item);
  const others = decisionMakers(item)
    .filter(p => !(primary && p.full_name === primary.full_name && p.business_email === primary.business_email))
    .map(p => [p.full_name, p.job_title, p.business_email].filter(Boolean).join(' – '));
  const score = scoreOf(item);
  return [
    text(item.company_name), text(item.email), text(item.phone), websiteOf(item),
    score === null ? '' : String(score), reasonOf(item),
    text(item.city), text(item.country), text(item.company_type),
    portfolioOf(item, Infinity).join(', '), channelsOf(item, Infinity).join(', '),
    hasConfirmedDirectImport(item) ? directImportLabel : '',
    primary?.full_name ?? '', primary?.job_title ?? '', primary?.business_email ?? '',
    others.join(' | '), list(item.additional_emails).join(', '),
    descriptionOf(item, language), list(item.source_urls).join(' '),
  ];
}

export function toCsv(rows: string[][], delimiter = ';'): string {
  return rows.map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(delimiter)).join('\r\n');
}

export interface SourcingContactRow {
  street: string | null; city: string | null; postal_code: string | null; country: string | null;
  phone: string | null; website_url: string | null; email: string | null; state: string | null;
  full_address: string | null; Address: string | null;
}

export function streetFrom(contact: SourcingContactRow | null): string | null {
  if (contact?.street) return contact.street;
  const raw = contact?.full_address || contact?.Address || null;
  const first = raw?.split(',')[0]?.trim();
  if (first && !/^\d{4,}$/.test(first) && first.toLowerCase() !== (contact?.city || '').toLowerCase()) return first;
  return null;
}

/** Lead insert mapping; buyer_id keeps its historic email-or-name value. */
export function buildSourcingLead(args: {
  item: SourcingShortlistItem; contact: SourcingContactRow | null; campaignId: string;
  marketLabel: string; requestId: string | null; userId: string; now: string;
}) {
  const { item, contact, campaignId, marketLabel, requestId, userId, now } = args;
  const email = text(item.email) || null;
  const reason = reasonOf(item) || null;
  return {
    campaign_id: campaignId,
    buyer_contact_id: buyerContactId(item),
    company_name: item.company_name,
    first_name: null,
    last_name: null,
    email: email || contact?.email || null,
    phone: text(item.phone) || contact?.phone || null,
    website_url: websiteOf(item) || contact?.website_url || null,
    address_line1: streetFrom(contact),
    address_line2: contact?.state || null,
    city: contact?.city || text(item.city) || null,
    postal_code: contact?.postal_code || null,
    country: contact?.country || text(item.country) || marketLabel || null,
    buyer_id: email || item.company_name,
    market: marketLabel,
    message_snippet: reason,
    owner_notes: 'Issu de Recherche sur-mesure',
    prospect_status: 'new' as const,
    last_activity_at: now,
    created_by: userId,
    source: 'sourcing',
    source_ref: requestId,
    source_score: scoreOf(item),
    source_relevance: reason,
  };
}
