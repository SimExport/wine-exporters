export const DIRECTORY_COUNTRIES = [
  { code: 'US', slug: 'etats-unis', fr: 'États-Unis', en: 'United States', flag: '🇺🇸', articleSlug: 'trouver-importateur-vin-etats-unis' },
  { code: 'UK', slug: 'royaume-uni', fr: 'Royaume-Uni', en: 'United Kingdom', flag: '🇬🇧', articleSlug: 'trouver-importateur-vin-royaume-uni' },
  { code: 'DE', slug: 'allemagne', fr: 'Allemagne', en: 'Germany', flag: '🇩🇪', articleSlug: 'trouver-importateur-vin-allemagne' },
  { code: 'BE', slug: 'belgique', fr: 'Belgique', en: 'Belgium', flag: '🇧🇪', articleSlug: 'trouver-importateur-vin-belgique' },
  { code: 'JP', slug: 'japon', fr: 'Japon', en: 'Japan', flag: '🇯🇵', articleSlug: 'trouver-importateur-vin-japon' },
  { code: 'CA', slug: 'canada', fr: 'Canada', en: 'Canada', flag: '🇨🇦', articleSlug: 'trouver-importateur-vin-canada' },
] as const;

export type DirectoryCountry = typeof DIRECTORY_COUNTRIES[number];
export interface PublicDirectoryCompany {
  slug: string;
  countryCode: string;
  name: string;
  description: string;
  website: string;
  sources: string[];
}
export const directoryCountry = (slug: string) => DIRECTORY_COUNTRIES.find(country => country.slug === slug);
/** SEO URLs of the directory are static `.html` files (hosting does not resolve clean URLs to prerendered files). */
export const DIRECTORY_HOME_PATH = '/annuaire.html';
export const countryPath = (country: Pick<DirectoryCountry, 'slug'>) => `/annuaire/${country.slug}.html`;
export const companyPath = (country: Pick<DirectoryCountry, 'slug'>, company: Pick<PublicDirectoryCompany, 'slug'>) => `/annuaire/${country.slug}/${company.slug}.html`;
export const stripHtmlSuffix = (segment?: string) => segment?.replace(/\.html$/, '') || undefined;
/** Canonical `.html` path for a directory route (clean SPA URLs canonicalise to it). */
export const directoryPath = (countrySlug?: string, slug?: string) =>
  countrySlug ? (slug ? `/annuaire/${countrySlug}/${slug}.html` : `/annuaire/${countrySlug}.html`) : DIRECTORY_HOME_PATH;

const EMBED_ID = 'public-directory-data';
export const DIRECTORY_EMBED_ID = EMBED_ID;
export const DIRECTORY_GUIDES_EMBED_ID = 'public-directory-guides-data';
/** Directory rows embedded in prerendered HTML (or provided by the prerender), so the first render matches the static markup. */
export function readEmbeddedDirectory(): PublicDirectoryCompany[] | null {
  const fromServer = (globalThis as { __PUBLIC_DIRECTORY__?: PublicDirectoryCompany[] }).__PUBLIC_DIRECTORY__;
  if (Array.isArray(fromServer)) return fromServer;
  // Typed structurally: this module is also compiled by the Node (build scripts) tsconfig, which has no DOM lib.
  const doc = (globalThis as { document?: { getElementById: (id: string) => { textContent: string | null } | null } }).document;
  if (!doc) return null;
  const node = doc.getElementById(EMBED_ID);
  if (!node?.textContent) return null;
  try { const data = JSON.parse(node.textContent); return Array.isArray(data) ? data : null; } catch { return null; }
}