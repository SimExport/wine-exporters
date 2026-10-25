// Read model deliberately separate from Supabase tables. Enrichment data is
// only reachable through the server-authorized get_importer_profile RPC
// (SECURITY DEFINER, auth.uid() required, trial accounts excluded, field
// allowlist, EXECUTE granted to authenticated only). Never query the protected
// enrichment tables directly from the browser.
export interface ImporterContact {
  id: string;
  company_name?: string | null;
  country: string;
  email?: string | null;
  phone?: string | null;
  website_url?: string | null;
  street?: string | null;
  city?: string | null;
  postal_code?: string | null;
  full_address?: string | null;
  Address?: string | null;
  Facebook?: string | null;
  Instagram?: string | null;
  LinkedIn?: string | null;
}

export interface ImporterEnrichment {
  description_fr?: string | null;
  description_en?: string | null;
  confidence: string;
  status: string;
  wine_origins?: string[];
  wine_regions?: string[];
  wine_appellations?: string[];
  wine_styles?: string[];
  wine_specialties?: string[];
  featured_producers?: string[];
  distribution_channels?: string[];
  direct_import_status?: string | null;
  commercial_notes?: string | null;
  source_urls?: string[];
}
export interface ImporterPerson {
  id: string; full_name: string; job_title?: string | null;
  business_email?: string | null; business_phone?: string | null;
  linkedin_url?: string | null; source_url?: string | null;
  confidence: string; last_verified_at?: string | null;
}
export interface ImporterEmail {
  id: string; email: string; email_purpose?: string | null;
  source_url?: string | null; confidence: string; last_verified_at?: string | null;
}
export interface ImporterEvidence {
  field_name: string; field_value?: string | null; source_url: string; confidence: string;
}
export interface ImporterProfileData {
  enrichment: ImporterEnrichment | null;
  people: ImporterPerson[];
  emails: ImporterEmail[];
  evidence: ImporterEvidence[];
}
export type ImporterProfileResult =
  | { status: 'ready'; data: ImporterProfileData }
  | { status: 'not-connected' | 'restricted' };
export interface ImporterProfileRepository {
  load: (contactId: string, signal: AbortSignal) => Promise<ImporterProfileResult>;
}

// Maps the get_importer_profile RPC payload to the typed read model. All
// enrichment statuses (verified, partial, review_needed) are returned: they
// describe enrichment progress, not rejection. Factual safeguards below keep
// unconfirmed claims from being displayed as certainties.
export function mapProfileResponse(payload: unknown): ImporterProfileResult {
  if (!payload || typeof payload !== 'object') {
    return { status: 'ready', data: { enrichment: null, people: [], emails: [], evidence: [] } };
  }
  const raw = payload as Record<string, unknown>;
  const enrichment = raw.enrichment && typeof raw.enrichment === 'object'
    ? (raw.enrichment as ImporterEnrichment) : null;
  const list = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
  return {
    status: 'ready',
    data: {
      enrichment,
      people: list<ImporterPerson>(raw.people),
      emails: list<ImporterEmail>(raw.emails),
      evidence: list<ImporterEvidence>(raw.evidence),
    },
  };
}

const FORBIDDEN_PATTERNS = ['Forbidden', 'Not authenticated', '42501', 'P0001'];

export const importerProfileRepository: ImporterProfileRepository = {
  async load(contactId, signal) {
    // Lazy import keeps this module usable in tests without Supabase env vars.
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await (supabase.rpc as any)('get_importer_profile', { _buyer_contact_id: contactId }).abortSignal(signal);
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    if (error) {
      if (FORBIDDEN_PATTERNS.some(p => String(error.message ?? '').includes(p) || String(error.code ?? '').includes(p))) {
        return { status: 'restricted' };
      }
      throw error;
    }
    return mapProfileResponse(data);
  },
};

export function safeExternalUrl(value?: string | null): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
export function cleanValues(values?: string[]): string[] {
  return [...new Set((values ?? []).map(v => v.trim()).filter(Boolean))];
}
export function descriptionFor(enrichment: ImporterEnrichment | null, language: string) {
  const en = enrichment?.description_en?.trim();
  const fr = enrichment?.description_fr?.trim();
  const wantsEnglish = language.startsWith('en');
  return { text: (wantsEnglish ? en || fr : fr || en) ?? '', language: wantsEnglish ? (en ? 'en' : 'fr') : (fr ? 'fr' : 'en') };
}
export function hasReliableDescription(enrichment: ImporterEnrichment | null): boolean {
  if (!enrichment || !descriptionFor(enrichment, 'fr').text) return false;
  // Review-needed and partial records are not validated profiles.
  return ['verified', 'validated'].includes(enrichment.status)
    && enrichment.confidence === 'high'
    && (enrichment.source_urls ?? []).some(url => Boolean(safeExternalUrl(url)));
}
export function importLabel(enrichment: ImporterEnrichment, evidence: ImporterEvidence[]): 'confirmed' | 'reported' | 'unconfirmed' {
  // `confirmed` is the explicit confirmation value used by current records.
  if (enrichment.direct_import_status === 'confirmed') return 'confirmed';
  if (enrichment.direct_import_status === 'confirmed_direct_import') {
    const explicit = evidence.some(e => e.field_name === 'direct_import_status'
      && e.field_value === 'confirmed_direct_import' && e.confidence === 'high'
      && Boolean(safeExternalUrl(e.source_url)));
    if (explicit) return 'confirmed';
  }
  return ['confirmed_direct_import', 'reported_direct_import'].includes(enrichment.direct_import_status ?? '') ? 'reported' : 'unconfirmed';
}
// Keep structured professional emails even without a source URL; never infer
// a person's email from the company's general contact or from free-text notes.
export function additionalProfileEmails(data: ImporterProfileData, primaryEmail?: string | null): ImporterEmail[] {
  const normalize = (email?: string | null) => email?.trim().toLowerCase() ?? '';
  const seen = new Set([normalize(primaryEmail), ...data.people.map(p => normalize(p.business_email))].filter(Boolean));
  return data.emails.flatMap(email => {
    const key = normalize(email.email);
    if (!key || seen.has(key)) return [];
    seen.add(key);
    return [{ ...email, email: email.email.trim() }];
  });
}
export function profileSources(data: ImporterProfileData): string[] {
  return [...new Set([
    ...(data.enrichment?.source_urls ?? []), ...data.people.map(p => p.source_url),
    ...data.emails.map(e => e.source_url), ...data.evidence.map(e => e.source_url),
  ].map(safeExternalUrl).filter((v): v is string => Boolean(v)))];
}
