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
export const companyPath = (country: DirectoryCountry, company: PublicDirectoryCompany) => `/annuaire/${country.slug}/${company.slug}`;