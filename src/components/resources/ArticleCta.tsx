import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEMO_URL, MARKET_ANALYSIS_PATH } from "@/lib/seo-articles";

interface ArticleCtaProps {
  variant: "market_analysis" | "demo";
}

/** Bloc CTA réutilisable des articles SEO. */
export const ArticleCta = ({ variant }: ArticleCtaProps) => {
  const { t } = useTranslation();
  const isMarket = variant === "market_analysis";
  return (
    <aside className="not-prose my-8 rounded-xl border border-primary/20 bg-secondary/50 p-6">
      <p className="font-display text-lg font-semibold text-foreground">
        {t(isMarket ? "seoArticles.cta.marketTitle" : "seoArticles.cta.demoTitle")}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {t(isMarket ? "seoArticles.cta.marketBody" : "seoArticles.cta.demoBody")}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {isMarket ? (
          <>
            <Button asChild>
              <Link to={MARKET_ANALYSIS_PATH}>
                {t("seoArticles.cta.marketButton")} <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <a
              href={DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary hover:underline"
            >
              {t("seoArticles.cta.demoButton")}
            </a>
          </>
        ) : (
          <Button asChild>
            <a href={DEMO_URL} target="_blank" rel="noopener noreferrer">
              {t("seoArticles.cta.demoButton")} <ArrowRight className="ml-1 h-4 w-4" />
            </a>
          </Button>
        )}
      </div>
    </aside>
  );
};
