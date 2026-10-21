// Read model deliberately separate from Supabase. Never query protected enrichment
// tables in the browser or use a client-side subscription check to authorize reads.
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

// Intentionally not connected: has_premium_access currently trusts an editable
// profiles.subscription_plan. A reviewed, server-authorized read API is required.
// No sample content and no reads (or credits consumed) masquerading as live data.
export const importerProfileRepository: ImporterProfileRepository = {
  async load() { return { status: 'not-connected' }; },
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
  if (enrichment.direct_import_status === 'confirmed_direct_import') {
    const explicit = evidence.some(e => e.field_name === 'direct_import_status'
      && e.field_value === 'confirmed_direct_import' && e.confidence === 'high'
      && Boolean(safeExternalUrl(e.source_url)));
    if (explicit) return 'confirmed';
  }
  return ['confirmed_direct_import', 'reported_direct_import'].includes(enrichment.direct_import_status ?? '') ? 'reported' : 'unconfirmed';
}
export function profileSources(data: ImporterProfileData): string[] {
  return [...new Set([
    ...(data.enrichment?.source_urls ?? []), ...data.people.map(p => p.source_url),
    ...data.emails.map(e => e.source_url), ...data.evidence.map(e => e.source_url),
  ].map(safeExternalUrl).filter((v): v is string => Boolean(v)))];
}