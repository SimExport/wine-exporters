import { COUNTRIES } from '@/components/importers/country-data';

/** Return a flag emoji (e.g. "🇫🇷") for a given country name/alias, or '' if unknown. */
export function getCountryFlag(name?: string | null): string {
  if (!name) return '';
  const norm = name.trim().toLowerCase();
  if (!norm) return '';
  const c = COUNTRIES.find(
    (c) =>
      c.name.toLowerCase() === norm ||
      c.englishName.toLowerCase() === norm ||
      (c.dbAliases || []).some((a) => a.toLowerCase() === norm),
  );
  if (!c?.isoA2) return '';
  const iso = c.isoA2.toUpperCase();
  if (iso.length !== 2) return '';
  return String.fromCodePoint(
    ...[...iso].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65),
  );
}