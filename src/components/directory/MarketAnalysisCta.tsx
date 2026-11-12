import { ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DEMO_URL, MARKET_ANALYSIS_PATH } from "@/lib/seo-articles";

/** Same visual treatment as article CTAs, with directory-specific editorial copy. */
export const MarketAnalysisCta = () => {
  const { t } = useTranslation();
  return (
    <aside className="my-8 rounded-xl border border-primary/20 bg-secondary/50 p-6">
      <p className="font-display text-lg font-semibold text-foreground">{t("publicDirectory.guideCta.title")}</p>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("publicDirectory.guideCta.body")}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button asChild>
          <Link to={MARKET_ANALYSIS_PATH}>{t("publicDirectory.guideCta.button")}<ArrowRight className="ml-1 h-4 w-4" /></Link>
        </Button>
        <a href={DEMO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm font-medium text-primary hover:underline">
          {t("publicDirectory.demo")}<ExternalLink className="ml-1 h-3.5 w-3.5" />
        </a>
      </div>
    </aside>
  );
};
