import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, FileText, Mail, Megaphone, RefreshCw, TrendingUp, Video, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

type EssentialResourceSlug =
  | "firstEmail"
  | "followCampaign"
  | "firstEmailAttachments"
  | "followUpStructure"
  | "followUpTemplates"
  | "respondOpportunity"
  | "sendSamples"
  | "followUpTasting";

type EssentialResourceType = "guide" | "template" | "video";

interface EssentialResource {
  slug: EssentialResourceSlug;
  type: EssentialResourceType;
  /** Optionnel : ajouter un lien dans une prochaine itération sans changer la structure. */
  href?: string;
  recommended?: boolean;
}

const ESSENTIAL_RESOURCES: EssentialResource[] = [
  { slug: "firstEmail", type: "guide" },
  { slug: "followCampaign", type: "guide", recommended: true },
  { slug: "firstEmailAttachments", type: "guide" },
  { slug: "followUpStructure", type: "guide" },
  { slug: "followUpTemplates", type: "template" },
  { slug: "respondOpportunity", type: "guide" },
  { slug: "sendSamples", type: "video" },
  { slug: "followUpTasting", type: "video" },
];

const TYPE_ICONS: Record<EssentialResourceType, LucideIcon> = {
  guide: BookOpen,
  template: FileText,
  video: Video,
};

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

      {/* Ressources essentielles */}
      <div>
        <h2 className="mb-1 text-2xl font-bold text-foreground">
          {t("resources.essential.title")}
        </h2>
        <p className="text-muted-foreground">{t("resources.essential.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {ESSENTIAL_RESOURCES.map((resource) => {
          const TypeIcon = TYPE_ICONS[resource.type];
          const base = `resources.essential.items.${resource.slug}`;
          const cta = (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              {t(`${base}.cta`)}
              <ArrowRight className="h-4 w-4" />
            </span>
          );

          return (
            <Card key={resource.slug} className="border hover:shadow-md transition-shadow">
              <CardContent className="flex h-full flex-col p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="font-normal">
                    {t(`${base}.category`)}
                  </Badge>
                  {resource.recommended && (
                    <Badge variant="outline" className="border-primary/40 text-primary font-normal">
                      {t("resources.essential.badges.recommended")}
                    </Badge>
                  )}
                </div>
                <h3 className="mb-1 text-sm font-semibold text-foreground">
                  {t(`${base}.title`)}
                </h3>
                <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TypeIcon className="h-3.5 w-3.5" />
                  {(() => {
                    const type = t(`${base}.type`);
                    const duration = t(`${base}.duration`, { defaultValue: "" });
                    return duration ? `${type} · ${duration}` : type;
                  })()}
                </p>
                <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                  {t(`${base}.description`)}
                </p>
                <div className="mt-auto">
                  {resource.href ? <Link to={resource.href}>{cta}</Link> : cta}
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
