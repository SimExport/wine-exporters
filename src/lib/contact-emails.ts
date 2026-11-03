// Historic buyer_contacts.email values may hold several addresses separated by
// newlines (or ; , whitespace). Split them so each address is rendered/exported on its own.
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function splitEmails(value?: string | null): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of value.split(/[\s,;]+/)) {
    const email = raw.trim().replace(/^mailto:/i, '');
    const key = email.toLowerCase();
    if (!email || !EMAIL_RE.test(email) || seen.has(key)) continue;
    seen.add(key);
    out.push(email);
  }
  return out;
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export interface ExportEnrichment {
  additional_emails?: string[] | null;
  decision_makers?: string[] | null;
  decision_maker_emails?: string[] | null;
}

export interface ExportEmailColumns {
  email: string;
  emails_additionnels: string;
  decideurs: string;
  emails_decideurs: string;
}

// Primary keeps the first historic address; other historic addresses and
// enrichment emails become "additional"; decision-maker emails are kept apart.
// Every address appears at most once across the three email columns.
export function buildExportEmailColumns(primary: string | null | undefined, enrichment?: ExportEnrichment | null): ExportEmailColumns {
  const historic = splitEmails(primary);
  const seen = new Set(historic.map(e => e.toLowerCase()));
  const take = (list?: string[] | null) => (list ?? []).flatMap(v => splitEmails(v)).filter(e => {
    const key = e.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const deciders = take(enrichment?.decision_maker_emails);
  const additional = [...historic.slice(1), ...take(enrichment?.additional_emails)];
  return {
    email: historic[0] ?? (primary ?? '').trim(),
    emails_additionnels: additional.join(' | '),
    decideurs: (enrichment?.decision_makers ?? []).map(d => d.trim()).filter(Boolean).join(' | '),
    emails_decideurs: deciders.join(' | '),
  };
}
