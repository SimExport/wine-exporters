import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { ArticleContent } from "@/components/resources/ArticleContent";
import { ArticleCta } from "@/components/resources/ArticleCta";
import { ArticleCard } from "@/components/resources/PublicArticlesSection";
import {
  buildArticleHead,
  estimateReadingTime,
  fetchArticleBySlug,
  fetchPublishedArticles,
  pickRelated,
  type SeoArticle,
  type SeoArticleSummary,
} from "@/lib/seo-articles";

const ResourceArticlePage = () => {
  const { slug = "" } = useParams();
  const { t, i18n } = useTranslation();
  const [article, setArticle] = useState<SeoArticle | null | undefined>(undefined);
  const [related, setRelated] = useState<SeoArticleSummary[]>([]);

  useEffect(() => {
    let active = true;
    setArticle(undefined);
    (async () => {
      try {
        const a = await fetchArticleBySlug(slug);
        if (!active) return;
        setArticle(a);
        if (a) {
          const all = await fetchPublishedArticles();
          if (active) setRelated(pickRelated(a, all));
        }
      } catch {
        if (active) setArticle(null);
      }
    })();
    return () => { active = false; };
  }, [slug]);

  if (article === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <SEO title="WineExporters" description="" path={`/ressources/${slug}`} noindex />
        <p className="mb-4 text-muted-foreground">{t("seoArticles.notFound")}</p>
        <Link to="/ressources" className="text-sm font-medium text-primary">{t("seoArticles.backToResources")}</Link>
      </div>
    );
  }

  const head = buildArticleHead(article);
  const fmt = (d: string) => new Date(d).toLocaleDateString(i18n.language, { day: "numeric", month: "long", year: "numeric" });
  const readingTime = article.reading_time || estimateReadingTime(article.content);
  const faq = (article.faq || []).filter((f) => f.question && f.answer);
  const cta = article.cta_type || "market_analysis";
  const wasUpdated = article.published_at && new Date(article.updated_at).getTime() - new Date(article.published_at).getTime() > 86400000;

  return (
    <article lang={article.language} className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      <SEO
        title={head.title}
        description={head.description}
        path={head.path}
        canonical={head.url}
        image={head.image}
        type="article"
        jsonLd={head.jsonLd}
      />

      <nav aria-label="breadcrumb" className="mb-6 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">{t("seoArticles.breadcrumbHome")}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to="/ressources" className="hover:text-foreground">{t("seoArticles.breadcrumbResources")}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground line-clamp-1">{article.title}</span>
      </nav>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {article.category && <Badge variant="secondary" className="font-normal">{article.category}</Badge>}
        {article.country && <span className="text-xs text-muted-foreground">{article.country}</span>}
      </div>

      <h1 className="font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">{article.title}</h1>

      <p className="mt-3 text-sm text-muted-foreground">
        {article.published_at && t("seoArticles.publishedOn", { date: fmt(article.published_at) })}
        {wasUpdated && ` · ${t("seoArticles.updatedOn", { date: fmt(article.updated_at) })}`}
        {` · ${t("seoArticles.minRead", { count: readingTime })}`}
      </p>

      {article.excerpt && <p className="mt-6 text-lg leading-relaxed text-foreground">{article.excerpt}</p>}

      {article.featured_image && (
        <img src={article.featured_image} alt="" className="mt-8 w-full rounded-xl object-cover" />
      )}

      <div className="mt-6">
        <ArticleContent content={article.content} />
      </div>

      {faq.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">{t("seoArticles.faq")}</h2>
          <div className="space-y-4">
            {faq.map((f, i) => (
              <div key={i} className="rounded-lg border p-4">
                <h3 className="font-semibold text-foreground">{f.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.answer}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {(cta === "market_analysis" || cta === "both") && <ArticleCta variant="market_analysis" />}
      {(cta === "demo" || cta === "both") && <ArticleCta variant="demo" />}

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">{t("seoArticles.related")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        </section>
      )}

      <Link to="/ressources" className="mt-10 inline-flex items-center gap-1 text-sm font-medium text-primary">
        <ArrowLeft className="h-4 w-4" /> {t("seoArticles.backToResources")}
      </Link>
    </article>
  );
};

export default ResourceArticlePage;
