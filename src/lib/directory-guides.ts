import { supabase } from "@/integrations/supabase/client";
import { DIRECTORY_COUNTRIES, DIRECTORY_GUIDES_EMBED_ID, type PublicDirectoryCompany } from "@/lib/directory-countries";
import { SITE_URL, type SeoArticleSummary } from "@/lib/seo-articles";

export interface DirectoryKeyFigure {
  label: string;
  value: string;
  unit: string | null;
  asOf: string | null;
  sourceName: string;
  sourceUrl: string;
}

export interface DirectoryGuideSource {
  label: string;
  url: string;
}

export interface DirectoryFaqItem {
  question: string;
  answer: string;
}

export interface DirectoryCountryGuide {
  countryCode: string;
  language: "fr" | "en";
  publishedAt: string;
  h1: string;
  intro: string;
  marketOverview: string;
  demandNotes: string | null;
  importerTypes: string | null;
  howToApproach: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  keyFigures: DirectoryKeyFigure[];
  faq: DirectoryFaqItem[];
  sources: DirectoryGuideSource[];
  relatedArticleSlugs: string[];
}

const GUIDE_FIELDS = "country_code,language,status,published_at,h1,intro,market_overview,demand_notes,importer_types,how_to_approach,meta_title,meta_description,key_figures,faq,sources,related_article_slugs";
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const record = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
const optionalText = (value: unknown) => value === null || value === undefined ? null : text(value);
const field = (row: Record<string, unknown>, snake: string, camel: string) => row[snake] ?? row[camel];

/** Editorial sources are public HTTPS pages, never credential-bearing or local URLs. */
export function directoryGuideSourceUrl(value: unknown): string | null {
  const candidate = text(value);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

function parseKeyFigures(value: unknown): DirectoryKeyFigure[] | null {
  if (!Array.isArray(value)) return null;
  const figures: DirectoryKeyFigure[] = [];
  for (const item of value) {
    const row = record(item);
    const label = text(row?.label);
    const figureValue = text(row?.value);
    const sourceName = text(row?.source_name ?? row?.sourceName);
    const sourceUrl = directoryGuideSourceUrl(row?.source_url ?? row?.sourceUrl);
    if (!row || !label || !figureValue || !sourceName || !sourceUrl) return null;
    const unit = optionalText(row.unit);
    const asOf = optionalText(row.as_of ?? row.asOf);
    if (row.unit !== null && row.unit !== undefined && !unit) return null;
    if ((row.as_of !== null && row.as_of !== undefined && !asOf) || (row.asOf !== null && row.asOf !== undefined && !asOf)) return null;
    figures.push({ label, value: figureValue, unit, asOf, sourceName, sourceUrl });
  }
  return figures;
}

function parseFaq(value: unknown): DirectoryFaqItem[] | null {
  if (!Array.isArray(value)) return null;
  const faq: DirectoryFaqItem[] = [];
  for (const item of value) {
    const row = record(item);
    const question = text(row?.question);
    const answer = text(row?.answer);
    if (!question || !answer) return null;
    faq.push({ question, answer });
  }
  return faq;
}

function parseSources(value: unknown): DirectoryGuideSource[] | null {
  if (!Array.isArray(value)) return null;
  const sources: DirectoryGuideSource[] = [];
  for (const item of value) {
    const row = record(item);
    const label = text(row?.label);
    const url = directoryGuideSourceUrl(row?.url);
    if (!label || !url) return null;
    sources.push({ label, url });
  }
  return sources;
}

/** Fail closed: incomplete, future, draft or improperly sourced editorial content never reaches a public page. */
export function parsePublishedDirectoryGuide(input: unknown, now = new Date()): DirectoryCountryGuide | null {
  const row = record(input);
  if (!row || row.status && row.status !== "published") return null;
  const countryCode = text(field(row, "country_code", "countryCode"));
  const language = text(row.language);
  const publishedAt = text(field(row, "published_at", "publishedAt"));
  const publishedTime = publishedAt ? Date.parse(publishedAt) : NaN;
  if (!countryCode || !DIRECTORY_COUNTRIES.some(country => country.code === countryCode)) return null;
  if (language !== "fr" && language !== "en") return null;
  if (!publishedAt || !Number.isFinite(publishedTime) || publishedTime > now.getTime()) return null;

  const h1 = text(row.h1);
  const intro = text(row.intro);
  const marketOverview = text(field(row, "market_overview", "marketOverview"));
  const keyFigures = parseKeyFigures(field(row, "key_figures", "keyFigures") ?? []);
  const faq = parseFaq(row.faq ?? []);
  const sources = parseSources(row.sources ?? []);
  const slugs = field(row, "related_article_slugs", "relatedArticleSlugs") ?? [];
  if (!h1 || !intro || !marketOverview || !keyFigures || !faq || !sources || !Array.isArray(slugs) || !slugs.every(slug => typeof slug === "string" && SLUG.test(slug))) return null;

  const optional = (snake: string, camel: string) => optionalText(field(row, snake, camel));
  return {
    countryCode,
    language,
    publishedAt: new Date(publishedTime).toISOString(),
    h1,
    intro,
    marketOverview,
    demandNotes: optional("demand_notes", "demandNotes"),
    importerTypes: optional("importer_types", "importerTypes"),
    howToApproach: optional("how_to_approach", "howToApproach"),
    metaTitle: optional("meta_title", "metaTitle"),
    metaDescription: optional("meta_description", "metaDescription"),
    keyFigures,
    faq,
    sources,
    relatedArticleSlugs: [...slugs],
  };
}

export function parsePublishedDirectoryGuides(inputs: unknown, now = new Date()): DirectoryCountryGuide[] {
  if (!Array.isArray(inputs)) return [];
  return inputs.map(input => parsePublishedDirectoryGuide(input, now)).filter((guide): guide is DirectoryCountryGuide => Boolean(guide));
}

/** Anonymous SELECT: RLS and these explicit filters expose only currently published editorial rows. */
export async function fetchPublishedDirectoryGuides(): Promise<DirectoryCountryGuide[]> {
  const { data, error } = await supabase
    .from("directory_country_guides")
    .select(GUIDE_FIELDS)
    .eq("status", "published")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(12);
  if (error) throw error;
  return parsePublishedDirectoryGuides(data);
}

export function readEmbeddedDirectoryGuides(): DirectoryCountryGuide[] | null {
  const fromServer = (globalThis as { __PUBLIC_DIRECTORY_GUIDES__?: unknown }).__PUBLIC_DIRECTORY_GUIDES__;
  if (Array.isArray(fromServer)) return parsePublishedDirectoryGuides(fromServer);
  const doc = (globalThis as { document?: { getElementById: (id: string) => { textContent: string | null } | null } }).document;
  const content = doc?.getElementById(DIRECTORY_GUIDES_EMBED_ID)?.textContent;
  if (!content) return null;
  try {
    return parsePublishedDirectoryGuides(JSON.parse(content));
  } catch {
    return null;
  }
}

export function guideForCountry(guides: DirectoryCountryGuide[], countryCode: string, uiLanguage: string) {
  const language = uiLanguage.startsWith("en") ? "en" : "fr";
  return guides.find(guide => guide.countryCode === countryCode && guide.language === language) ?? null;
}

/** Slugs are editorial suggestions only; the already filtered published article list is the source of truth. */
export function guideArticles(guide: DirectoryCountryGuide, publishedArticles: SeoArticleSummary[]) {
  return guide.relatedArticleSlugs
    .map(slug => publishedArticles.find(article => article.slug === slug))
    .filter((article): article is SeoArticleSummary => Boolean(article));
}

export function buildDirectoryGuideJsonLd({ guide, path, countryName, homeLabel, directoryLabel, companies }: {
  guide: DirectoryCountryGuide;
  path: string;
  countryName: string;
  homeLabel: string;
  directoryLabel: string;
  companies: Array<Pick<PublicDirectoryCompany, "name"> & { path: string }>;
}) {
  const url = `${SITE_URL}${path}`;
  const jsonLd: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: guide.h1,
      description: guide.metaDescription || guide.intro,
      inLanguage: guide.language,
      datePublished: guide.publishedAt,
      url,
      about: { "@type": "Country", name: countryName },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: homeLabel, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: directoryLabel, item: `${SITE_URL}/annuaire.html` },
        { "@type": "ListItem", position: 3, name: countryName, item: url },
      ],
    },
  ];
  if (guide.faq.length) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: guide.faq.map(item => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
  }
  if (companies.length) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: companies.map((company, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: company.name,
        url: `${SITE_URL}${company.path}`,
      })),
    });
  }
  return jsonLd;
}
