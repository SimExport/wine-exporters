import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Mail, Megaphone, RefreshCw, TrendingUp, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SEO } from "@/components/SEO";

type ResourceCardKey = "contactImporter" | "followCampaign" | "followProspect" | "moveOpportunity";

interface ResourceCardConfig {
  key: ResourceCardKey;
  icon: LucideIcon;
  /** Optionnel : ajouter un lien dans une prochaine itération sans changer la structure. */
  href?: string;
}

const RESOURCE_CARDS: ResourceCardConfig[] = [
  { key: "contactImporter", icon: Mail },
  { key: "followCampaign", icon: Megaphone },
  { key: "followProspect", icon: RefreshCw },
  { key: "moveOpportunity", icon: TrendingUp },
];

const Resources = () => {
  const { t } = useTranslation();

  return (
    <div className="p-8 lg:p-10 space-y-10 max-w-6xl">
      <SEO
        title={t("seo.resources.title")}
        description={t("seo.resources.description")}
        path="/ressources"
      />

      {/* Hero */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">{t("resources.title")}</h1>
        </div>
        <p className="text-muted-foreground text-lg max-w-2xl">{t("resources.subtitle")}</p>
      </div>

      {/* Cartes principales */}
      <div className="grid gap-4 sm:grid-cols-2">
        {RESOURCE_CARDS.map((card) => {
          const Icon = card.icon;
          const topics =
            (t(`resources.cards.${card.key}.topics`, { returnObjects: true }) as string[]) || [];
          const cta = (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              {t(`resources.cards.${card.key}.cta`)}
              <ArrowRight className="h-4 w-4" />
            </span>
          );

          return (
            <Card key={card.key} className="border hover:shadow-md transition-shadow">
              <CardContent className="flex h-full flex-col p-5">
                <div className="mb-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <h2 className="mb-1 text-base font-semibold text-foreground">
                  {t(`resources.cards.${card.key}.title`)}
                </h2>
                <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                  {t(`resources.cards.${card.key}.description`)}
                </p>
                <p className="mb-4 text-xs text-muted-foreground/80">{topics.join(" · ")}</p>
                <div className="mt-auto">
                  {card.href ? <Link to={card.href}>{cta}</Link> : cta}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Resources;
