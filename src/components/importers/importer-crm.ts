// Adding an importer to the CRM from /importers. Pure logic, React-free and
// testable without Supabase env vars. The manual container name mirrors
// MANUAL_CAMPAIGN_NAME in src/lib/manual-campaign.ts; it is duplicated here so
// this module never pulls the Supabase client into tests.
import type { ImporterContact } from '@/lib/importer-profile';

const MANUAL_CAMPAIGN_NAME = 'Prospects manuels';

export type AddToCrmResult = 'added' | 'duplicate' | 'no-container' | 'error';

/** Minimal Supabase-like client surface used by addImporterToCrm. */
export interface CrmClient {
  from: (table: string) => any;
}

/**
 * Insert a buyer contact into the current owner's PRE-EXISTING private manual
 * container. Never creates a campaign, never touches another user's data:
 * ownership is enforced server-side by RLS on campaigns/leads, and the
 * duplicate check only reads leads joined through campaigns!inner(user_id).
 */
export async function addImporterToCrm(
  client: CrmClient,
  userId: string,
  contact: ImporterContact,
): Promise<AddToCrmResult> {
  // 1. Read-only lookup of the existing manual container. If it is missing or
  // unreadable, the CRM must be initialized from the CRM pages — /importers
  // never creates it.
  const { data: container, error: containerError } = await client
    .from('campaigns')
    .select('id')
    .eq('user_id', userId)
    .eq('name', MANUAL_CAMPAIGN_NAME)
    .eq('status', 'manual')
    .maybeSingle();
  if (containerError || !container?.id) return 'no-container';

  // 2. Duplicate check across ALL of the owner's leads (any container), first
  // by buyer_contact_id, then by normalized email when available.
  const ownerLeads = () =>
    client
      .from('leads')
      .select('id, campaigns!inner(user_id)')
      .eq('campaigns.user_id', userId);
  const { data: byContact, error: contactDupError } = await ownerLeads()
    .eq('buyer_contact_id', contact.id)
    .maybeSingle();
  if (contactDupError) return 'error';
  if (byContact) return 'duplicate';
  const email = contact.email?.trim().toLowerCase() || '';
  if (email) {
    const { data: byEmail, error: emailDupError } = await ownerLeads()
      .ilike('email', email)
      .maybeSingle();
    if (emailDupError) return 'error';
    if (byEmail) return 'duplicate';
  }

  // 3. First existing pipeline stage; null is fine — the Kanban classes it.
  const { data: stage } = await client
    .from('pipeline_stages')
    .select('id')
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle();

  // 4. Insert stored contact data only: no invented names, no campaign link.
  const { error } = await client.from('leads').insert({
    campaign_id: container.id,
    buyer_contact_id: contact.id,
    company_name: contact.company_name ?? null,
    email: contact.email ?? null,
    phone: contact.phone ?? null,
    website_url: contact.website_url ?? null,
    address_line1: contact.street ?? null,
    city: contact.city ?? null,
    postal_code: contact.postal_code ?? null,
    country: contact.country ?? null,
    buyer_id: email || 'unknown',
    market: contact.country || 'unknown',
    prospect_status: 'new',
    stage_id: stage?.id ?? null,
    last_activity_at: new Date().toISOString(),
    created_by: userId,
    source: 'manual',
  });
  return error ? 'error' : 'added';
}
