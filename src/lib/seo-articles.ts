import { supabase } from "@/integrations/supabase/client";

/**
 * Articles SEO publics (table seo_articles).
 * Les fonctions de ce fichier sont volontairement pures / indépendantes de React
 * pour pouvoir être réutilisées plus tard par un prérendu ou un rendu serveur.
 */

export const SITE_URL = "https://wine-exporters.com";
export const DEMO_URL = "https://calendar.app.google/rfx7N1bBhJcbwyJg9";
export const MARKET_ANALYSIS_PATH = "/market-analysis";

export type ArticleStatus = "draft" | "published";
export type ArticleCtaType = "market_analysis" | "demo" | "both" | "none";
export const CONTENT_TYPES = ["guide", "market", "how_to", "case_study", "news"] as const;

export interface FaqItem {
  question: string;
  answer: string;
}

export interface SeoArticle {
  id: string;
  title: string;
  seo_title: string | null;
  slug: string;
  language: string;
  content_type: string;
  excerpt: string | null;
  content: string;
  category: string | null;
  country: string | null;
  featured_image: string | null;
  og_image: string | null;
  author: string | null;
  status: ArticleStatus;
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  focus_keyword: string | null;
  canonical_url: string | null;
  is_featured: boolean;
  reading_time: number | null;
  cta_type: ArticleCtaType | null;
  related_article_ids: string[];
  faq: FaqItem[];
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type SeoArticleSummary = Pick<
  SeoArticle,
  "id" | "title" | "slug" | "excerpt" | "category" | "country" | "featured_image" | "published_at" | "is_featured" | "reading_time" | "content_type" | "language"
>;

const SUMMARY_FIELDS =
  "id,title,slug,excerpt,category,country,featured_image,published_at,is_featured,reading_time,content_type,language";

// La table est récente : on passe par un client non typé pour ne pas dépendre de la régénération des types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const articlesTable = () => (supabase as any).from("seo_articles");

/** Articles publiés (la RLS ne renvoie que published + date passée). */
export async function fetchPublishedArticles(): Promise<SeoArticleSummary[]> {
  const { data, error } = await articlesTable()
    .select(SUMMARY_FIELDS)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("is_featured", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as SeoArticleSummary[];
}

export async function fetchArticleBySlug(slug: string): Promise<SeoArticle | null> {
  const { data, error } = await articlesTable()
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  return (data as SeoArticle) ?? null;
}

/** Articles liés : choix manuel, sinon même catégorie puis même pays (3 max). */
export function pickRelated(article: SeoArticle, all: SeoArticleSummary[], max = 3): SeoArticleSummary[] {
  const others = all.filter((a) => a.id !== article.id);
  if (article.related_article_ids?.length) {
    const manual = article.related_article_ids
      .map((id) => others.find((a) => a.id === id))
      .filter(Boolean) as SeoArticleSummary[];
    if (manual.length) return manual.slice(0, max);
  }
  const score = (a: SeoArticleSummary) =>
    (a.category && a.category === article.category ? 2 : 0) + (a.country && a.country === article.country ? 1 : 0);
  return [...others].sort((a, b) => score(b) - score(a)).slice(0, max);
}

export function estimateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export function articlePath(slug: string) {
  return `/ressources/${slug}`;
}

/** Métadonnées d'un article (réutilisable côté serveur plus tard). */
export function buildArticleHead(article: SeoArticle) {
  const path = articlePath(article.slug);
  const url = article.canonical_url || `${SITE_URL}${path}`;
  const title = article.meta_title || article.seo_title || `${article.title} | WineExporters`;
  const description = article.meta_description || article.excerpt || "";
  const image = article.og_image || article.featured_image || undefined;

  const jsonLd: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.seo_title || article.title,
      description,
      inLanguage: article.language,
      datePublished: article.published_at,
      dateModified: article.updated_at,
      author: { "@type": "Organization", name: article.author || "WineExporters" },
      publisher: { "@type": "Organization", name: "WineExporters", url: SITE_URL },
      mainEntityOfPage: url,
      ...(image ? { image } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "WineExporters", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Ressources", item: `${SITE_URL}/ressources` },
        { "@type": "ListItem", position: 3, name: article.title, item: url },
      ],
    },
  ];
  const faq = (article.faq || []).filter((f) => f.question && f.answer);
  if (faq.length) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
  }
  return { path, url, title, description, image, jsonLd };
}
