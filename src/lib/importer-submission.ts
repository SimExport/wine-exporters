// React-free mapping for native importer submissions (public form + admin publication).

export const STYLE_OPTIONS = [
  { en: 'Red', fr: 'Rouge' }, { en: 'White', fr: 'Blanc' }, { en: 'Rosé', fr: 'Rosé' },
  { en: 'Sparkling', fr: 'Effervescent' }, { en: 'Fortified or sweet', fr: 'Muté ou doux' }, { en: 'Other', fr: 'Autre' },
] as const;
export const ORIGIN_OPTIONS = [
  { en: 'France', fr: 'France' }, { en: 'Italy', fr: 'Italie' }, { en: 'Spain', fr: 'Espagne' },
  { en: 'Portugal', fr: 'Portugal' }, { en: 'Other Europe', fr: 'Autre Europe' }, { en: 'New World', fr: 'Nouveau Monde' },
] as const;
export const VOLUME_OPTIONS = [
  { en: '< 600 bottles / year', fr: '< 600 bouteilles / an' },
  { en: '600–1,800 bottles / year', fr: '600–1 800 bouteilles / an' },
  { en: '1,800–10,000 bottles / year', fr: '1 800–10 000 bouteilles / an' },
  { en: '> 10,000 bottles / year', fr: '> 10 000 bouteilles / an' },
  { en: 'Not known yet', fr: 'Pas encore défini' },
] as const;

export const RELAY_EMAIL = 'simon@exportvins.fr';
export const RELAY_NAME = 'WineExporters — contact modéré';

type Opt = readonly { en: string; fr: string }[];
const ALL: Opt = [...STYLE_OPTIONS, ...ORIGIN_OPTIONS, ...VOLUME_OPTIONS];

export function joinCanonical(values: string[]): string { return values.join(', '); }

/** Controlled EN -> FR translation of canonical list values; unknown values are kept as-is. */
export function translateList(csv: string | null | undefined): string | null {
  if (!csv?.trim()) return null;
  const whole = csv.trim();
  const exact = ALL.find(o => o.en === whole);
  if (exact) return exact.fr;
  return whole.split(',').map(v => v.trim()).filter(Boolean)
    .map(v => ALL.find(o => o.en === v)?.fr ?? v).join(', ');
}

export interface Submission {
  id: string; created_at: string; full_name: string; company_name: string; country: string;
  email: string; phone: string | null; sample_address: string | null; wine_styles: string; origins: string;
  volume: string | null; price_range: string | null; requirements: string | null;
  consent_publish: boolean; consent_direct_contact: boolean; locale: string;
}

/** Builds the public importer_requests row. Never exposes private contacts without explicit consent. */
export function buildPublication(s: Submission) {
  const direct = s.consent_direct_contact === true;
  const free = s.requirements?.trim() || '';
  const price = s.price_range?.trim() || '';
  const lang = s.locale === 'fr' ? 'fr' : 'en';
  const en: string[] = [], fr: string[] = [];
  if (free) {
    en.push(lang === 'en' ? free : `[Original in French] ${free}`);
    fr.push(lang === 'fr' ? free : `[Texte original en anglais] ${free}`);
  }
  if (price) { en.push(`Budget (EXW): ${price}`); fr.push(`Budget (EXW) : ${price}`); }
  if (!direct) {
    en.push('Replies are forwarded to the buyer by WineExporters.');
    fr.push('Les réponses sont transmises à l’acheteur par WineExporters.');
  }
  const reqEn = en.join('\n\n') || null;
  const reqFr = fr.join('\n\n') || null;
  return {
    full_name: direct ? s.full_name : RELAY_NAME,
    company_name: s.company_name,
    country: s.country,
    email: direct ? s.email : RELAY_EMAIL,
    phone: direct ? s.phone : null,
    wine_styles: s.wine_styles, wine_styles_en: s.wine_styles, wine_styles_fr: translateList(s.wine_styles),
    origins: s.origins, origins_en: s.origins, origins_fr: translateList(s.origins),
    volume: s.volume, volume_en: s.volume, volume_fr: translateList(s.volume),
    requirements: lang === 'fr' ? reqFr : reqEn, requirements_en: reqEn, requirements_fr: reqFr,
    status: 'published',
    submitted_at: s.created_at,
    created_at: new Date().toISOString(),
  };
}

export function normalizeCompany(s: string | null | undefined): string {
  return (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\b(ltd|llc|inc|gmbh|bv|b v|ab|aps|as|sas|sarl|co)\b/g, '').replace(/[^a-z0-9]+/g, '');
}
