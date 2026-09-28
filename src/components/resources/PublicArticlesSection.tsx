import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { articlePath, fetchPublishedArticles, type SeoArticleSummary } from "@/lib/seo-articles";

export const ArticleCard = ({ article, featured }: { article: SeoArticleSummary; featured?: boolean }) => {
  const { t, i18n } = useTranslation();
  return (
    <Link to={articlePath(article.slug)} className={featured ? "block sm:col-span-2" : "block"}>
      <Card className="h-full overflow-hidden border hover:shadow-md transition-shadow">
        {article.featured_image && (
          <img
            src={article.featured_image}
            alt=""
            loading="lazy"
            className={featured ? "h-56 w-full object-cover" : "h-40 w-full object-cover"}
          />
        )}
        <CardContent className="flex h-full flex-col p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {featured && (
              <Badge variant="outline" className="border-primary/40 text-primary font-normal">
                {t("seoArticles.featured")}
              </Badge>
            )}
            {article.category && <Badge variant="secondary" className="font-normal">{article.category}</Badge>}
            {article.country && <span className="text-xs text-muted-foreground">{article.country}</span>}
          </div>
          <h3 className={featured ? "mb-2 font-display text-xl font-semibold text-foreground" : "mb-2 text-base font-semibold text-foreground"}>
            {article.title}
          </h3>
          {article.excerpt && (
            <p className="mb-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{article.excerpt}</p>
          )}
          <div className="mt-auto flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {article.published_at && new Date(article.published_at).toLocaleDateString(i18n.language)}
              {article.reading_time ? ` · ${t("seoArticles.minRead", { count: article.reading_time })}` : ""}
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              {t("seoArticles.readMore")} <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

/** Liste des articles publics. `hideWhenEmpty` : n'affiche rien s'il n'y a aucun article. */
export const PublicArticlesSection = ({ hideWhenEmpty, hideSubtitle }: { hideWhenEmpty?: boolean; hideSubtitle?: boolean }) => {
  const { t } = useTranslation();
  const [articles, setArticles] = useState<SeoArticleSummary[] | null>(null);

  useEffect(() => {
    fetchPublishedArticles().then(setArticles).catch(() => setArticles([]));
  }, []);

  if (articles === null) return null;
  if (!articles.length && hideWhenEmpty) return null;

  return (
    <section id="articles" className="scroll-mt-8 space-y-4">
      <div>
        <h2 className="mb-1 text-2xl font-bold text-foreground">{t("seoArticles.publicTitle")}</h2>
        {!hideSubtitle && <p className="text-muted-foreground">{t("seoArticles.publicSubtitle")}</p>}
      </div>
      {articles.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {articles.map((a, i) => (
            <ArticleCard key={a.id} article={a} featured={i === 0 && a.is_featured} />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">{t("seoArticles.empty")}</p>
      )}
    </section>
  );
};
