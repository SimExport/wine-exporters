import { cleanBuyerRequirements } from './opportunity-display';
import { splitMulti } from './opportunity-filters';

export type ImporterNeeds = {
  requirements: string;
  styles: string[];
  origins: string[];
  volume: string;
  fallbackSnippet: string;
};

const pickLocalized = (row: Record<string, unknown> | null | undefined, base: string, lang: 'fr' | 'en'): string => {
  const v = row?.[`${base}_${lang}`] ?? row?.[base];
  return typeof v === 'string' ? v.trim() : '';
};

/** Builds the importer needs block; falls back to the lead's stored snippet when the request is unavailable. */
export function buildImporterNeeds(
  request: Record<string, unknown> | null | undefined,
  snippet: string | null | undefined,
  language: string | undefined,
): ImporterNeeds | null {
  const lang: 'fr' | 'en' = language?.startsWith('en') ? 'en' : 'fr';
  if (request) {
    const needs: ImporterNeeds = {
      requirements: cleanBuyerRequirements(pickLocalized(request, 'requirements', lang)),
      styles: splitMulti(pickLocalized(request, 'wine_styles', lang) || null),
      origins: splitMulti(pickLocalized(request, 'origins', lang) || null),
      volume: pickLocalized(request, 'volume', lang),
      fallbackSnippet: '',
    };
    if (needs.requirements || needs.styles.length || needs.origins.length || needs.volume) return needs;
  }
  const fb = (snippet ?? '').trim();
  return fb ? { requirements: '', styles: [], origins: [], volume: '', fallbackSnippet: fb } : null;
}
