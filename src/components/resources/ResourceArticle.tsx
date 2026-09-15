import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Clock, Copy, FileText, Video, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";

export type ResourceArticleType = "guide" | "template" | "video";

const TYPE_ICONS: Record<ResourceArticleType, LucideIcon> = {
  guide: BookOpen,
  template: FileText,
  video: Video,
};

export interface ResourceArticleConfig {
  /** Clé i18n de la ressource : resources.articles.<key> */
  i18nKey: string;
  /** Route de la page, utilisée pour le SEO. */
  path: string;
  type: ResourceArticleType;
  /** Optionnel : lien de l'étape suivante, ajouté quand la ressource existera. */
  nextHref?: string;
  /** Optionnel : vidéo Loom intégrée en 16:9. */
  loomEmbedUrl?: string;
}

interface ArticleStep {
  title: string;
  body: string;
}

interface ArticleSection {
  title: string;
  intro?: string;
  points?: string[];
  steps?: ArticleStep[];
  body?: string[];
  outro?: string;
}

interface ArticleTemplate {
  title?: string;
  subjectLabel?: string;
  subject?: string;
  body: string;
  copy?: string;
  copied?: string;
}

/**
 * Template réutilisable pour les pages de détail des ressources.
 * Tout le contenu vient de resources.articles.<i18nKey> dans les fichiers de traduction.
 * Chaque section n'est rendue que si son contenu existe dans les traductions.
 */
export const ResourceArticle = ({ config }: { config: ResourceArticleConfig }) => {
  const { t } = useTranslation();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const base = `resources.articles.${config.i18nKey}`;
  const TypeIcon = TYPE_ICONS[config.type];

  const str = (key: string) => t(`${base}.${key}`, { defaultValue: "" }) as string;
  const arr = <T,>(key: string): T[] => {
    const value = t(`${base}.${key}`, { returnObjects: true, defaultValue: [] });
    return Array.isArray(value) ? (value as T[]) : [];
  };

  const title = t(`${base}.title`);
  const intro = str("intro");
  const duration = str("meta.duration");

  const whenBody = arr<string>("when.body");
  const recommendPoints = arr<string>("recommend.points");
  const recommendTitle = str("recommend.title");
  const structureSteps = arr<ArticleStep>("structure.steps");
  const sections = arr<ArticleSection>("sections");
  const avoidPoints = arr<string>("avoid.points");
  const takeawayPoints = arr<string>("takeaways.points");
  const nextLabel = str("next.label");

  const singleTemplateBody = str("template.body");
  const templates: ArticleTemplate[] = singleTemplateBody
    ? [
        {
          title: str("template.title"),
          subjectLabel: str("template.subjectLabel"),
          subject: str("template.subject"),
          body: singleTemplateBody,
          copy: str("template.copy"),
          copied: str("template.copied"),
        },
      ]
    : arr<ArticleTemplate>("templates");

  const handleCopy = async (body: string, index: number) => {
    try {
      await navigator.clipboard.writeText(body);
      setCopiedIndex(index);
      window.setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      /* presse-papiers indisponible */
    }
  };

  const bulletList = (points: string[]) => (
    <ul className="ml-5 list-disc space-y-1.5 text-sm leading-relaxed text-muted-foreground">
      {points.map((point, i) => (
        <li key={i}>{point}</li>
      ))}
    </ul>
  );

  const numberedSteps = (steps: ArticleStep[]) => (
    <ol className="space-y-4">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {i + 1}
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">{step.title}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="p-8 lg:p-10 space-y-8 max-w-3xl">
      <SEO title={title} description={intro} path={config.path} />

      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/ressources" className="hover:text-foreground transition-colors">
          {t("resources.title")}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{title}</span>
      </nav>

      {/* Titre + métadonnées */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="font-normal">
            {t(`${base}.meta.category`)}
          </Badge>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <TypeIcon className="h-3.5 w-3.5" />
            {t(`${base}.meta.type`)}
          </span>
          {duration && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {duration}
            </span>
          )}
        </div>
      </div>

      {/* Introduction */}
      {intro && <p className="text-base leading-relaxed text-muted-foreground">{intro}</p>}

      {/* Vidéo */}
      {config.loomEmbedUrl && (
        <div className="aspect-video w-full overflow-hidden rounded-lg border">
          <iframe
            src={config.loomEmbedUrl}
            title={title}
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      )}

      {/* Quand utiliser cette méthode */}
      {whenBody.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">{t(`${base}.when.title`)}</h2>
          {whenBody.map((paragraph, i) => (
            <p key={i} className="text-sm leading-relaxed text-muted-foreground">
              {paragraph}
            </p>
          ))}
        </section>
      )}

      {/* Ce que nous recommandons */}
      {recommendTitle && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">{recommendTitle}</h2>
          {str("recommend.intro") && (
            <p className="text-sm leading-relaxed text-muted-foreground">{str("recommend.intro")}</p>
          )}
          {recommendPoints.length > 0 && bulletList(recommendPoints)}
          {str("recommend.outro") && (
            <p className="text-sm leading-relaxed text-muted-foreground">{str("recommend.outro")}</p>
          )}
        </section>
      )}

      {/* Structure */}
      {structureSteps.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">{t(`${base}.structure.title`)}</h2>
          {numberedSteps(structureSteps)}
        </section>
      )}

      {/* Sections libres */}
      {sections.map((section, i) => (
        <section key={i} className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
          {section.intro && (
            <p className="text-sm leading-relaxed text-muted-foreground">{section.intro}</p>
          )}
          {section.body?.map((paragraph, j) => (
            <p key={j} className="text-sm leading-relaxed text-muted-foreground">
              {paragraph}
            </p>
          ))}
          {section.points && section.points.length > 0 && bulletList(section.points)}
          {section.steps && section.steps.length > 0 && numberedSteps(section.steps)}
          {section.outro && (
            <p className="text-sm leading-relaxed text-muted-foreground">{section.outro}</p>
          )}
        </section>
      ))}

      {/* Modèles d'email */}
      {templates.map((template, index) => (
        <section key={index} className="space-y-3">
          {template.title && (
            <h2 className="text-xl font-semibold text-foreground">{template.title}</h2>
          )}
          <Card className="border bg-muted/40">
            <CardContent className="space-y-4 p-5">
              {template.subject && (
                <p className="text-sm font-medium text-foreground">
                  {template.subjectLabel || t("resources.template.subjectLabel")} : {template.subject}
                </p>
              )}
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {template.body}
              </p>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => handleCopy(template.body, index)}>
                  {copiedIndex === index ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {template.copy || t("resources.template.copy")}
                </Button>
                {copiedIndex === index && (
                  <span className="text-xs text-muted-foreground">
                    {template.copied || t("resources.template.copied")}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      ))}

      {/* À éviter */}
      {avoidPoints.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">{t(`${base}.avoid.title`)}</h2>
          {bulletList(avoidPoints)}
        </section>
      )}

      {/* À retenir */}
      {takeawayPoints.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">{t(`${base}.takeaways.title`)}</h2>
          {bulletList(takeawayPoints)}
        </section>
      )}

      {/* Étape suivante */}
      {nextLabel && (
        <Card className="border">
          <CardContent className="p-5">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t(`${base}.next.title`)}
            </p>
            {config.nextHref ? (
              <Link
                to={config.nextHref}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary"
              >
                {nextLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                {nextLabel}
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </span>
            )}
          </CardContent>
        </Card>
      )}

      {/* Retour aux ressources */}
      <Link
        to="/ressources"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("resources.backToResources")}
      </Link>
    </div>
  );
};
