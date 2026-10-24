import { DIRECTORY_COUNTRIES, type PublicDirectoryCompany } from '../src/lib/directory-countries';

/** Build/server only. Never import this registry into browser code or hydrate it from buyer tables. */
export interface PublicationCandidate {
  existingCompanyId: string;
  approval: { editorial: boolean; rights: boolean; approvedAt: string; evidence: string };
  publicFields: PublicDirectoryCompany;
}

// No existing company has a verifiable publication/licensing approval. Intentionally empty.
export const APPROVED_PUBLIC_COMPANIES: PublicationCandidate[] = [];

const httpsUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash; }
  catch { return false; }
};
const cleanText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && !/[<>@]|\b(?:\+?\d[\s().-]*){7,}\b/.test(value);

/** Explicit public projection, no object spreading: approval metadata and unknown fields cannot escape. */
export function projectPublicDirectory(candidates: PublicationCandidate[]): PublicDirectoryCompany[] {
  const counts = new Map<string, number>();
  const seen = new Set<string>();
  const result: PublicDirectoryCompany[] = [];
  for (const candidate of candidates) {
    const { approval, publicFields: fields } = candidate;
    if (!candidate.existingCompanyId || !approval?.editorial || !approval.rights || !approval.evidence?.trim() || !Number.isFinite(Date.parse(approval.approvedAt))) continue;
    if (!fields || !DIRECTORY_COUNTRIES.some(country => country.code === fields.countryCode)) continue;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fields.slug) || !cleanText(fields.name) || !cleanText(fields.description) || !httpsUrl(fields.website)) continue;
    if (!Array.isArray(fields.sources) || !fields.sources.length || !fields.sources.every(httpsUrl)) continue;
    const key = `${fields.countryCode}/${fields.slug}`;
    const count = counts.get(fields.countryCode) ?? 0;
    if (seen.has(key) || count >= 5 || result.length >= 30) continue;
    result.push({ slug: fields.slug, countryCode: fields.countryCode, name: fields.name.trim(), description: fields.description.trim(), website: fields.website, sources: [...fields.sources] });
    counts.set(fields.countryCode, count + 1);
    seen.add(key);
  }
  return result;
}

export function directoryPublicationPlugin() {
  const publicJson = () => JSON.stringify(projectPublicDirectory(APPROVED_PUBLIC_COMPANIES));
  return {
    name: 'approved-public-directory',
    configureServer(server: { middlewares: { use: (path: string, handler: (req: unknown, res: { setHeader: (key: string, value: string) => void; end: (body: string) => void }) => void) => void } }) {
      server.middlewares.use('/directory-public.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(publicJson());
      });
    },
    generateBundle(this: { emitFile: (file: { type: 'asset'; fileName: string; source: string }) => void }) {
      this.emitFile({ type: 'asset', fileName: 'directory-public.json', source: publicJson() });
    },
  };
}