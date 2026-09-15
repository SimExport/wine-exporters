import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Check, ChevronRight, Clock, Copy, FileText, Video, type LucideIcon } from "lucide-react";
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
}

/**
 * Template réutilisable pour les pages de détail des ressources.
 * Tout le contenu vient de resources.articles.<i18nKey> dans les fichiers de traduction.
 */
export const ResourceArticle = ({ config }: { config: ResourceArticleConfig }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const base = `resources.articles.${config.i18nKey}`;
  const TypeIcon = TYPE_ICONS[config.type];

  const list = (key: string) => (t(key, { returnObjects: true }) as string[]) || [];
  const steps =
    (t(`${base}.structure.steps`, { returnObjects: true }) as { title: string; body: string }[]) || [];

  const templateBody = t(`${base}.template.body`);
  const templateSubject = t(`${base}.template.subject`);
  const duration = t(`${base}.meta.duration`, { defaultValue: "" });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(templateBody);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* presse-papiers indisponible */
    }
  };

  return (
    <div className="p-8 lg:p-10 space-y-8 max-w-3xl">
      <SEO title={t(`${base}.title`)} description={t(`${base}.intro`)} path={config.path} />

      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/ressources" className="hover:text-foreground transition-colors">
          {t("resources.title")}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{t(`${base}.title`)}</span>
      </nav>

      {/* Titre + métadonnées */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-foreground">{t(`${base}.title`)}</h1>
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
      <p className="text-base leading-relaxed text-muted-foreground">{t(`${base}.intro`)}</p>

      {/* Quand utiliser cette méthode */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">{t(`${base}.when.title`)}</h2>
        {list(`${base}.when.body`).map((paragraph, i) => (
          <p key={i} className="text-sm leading-relaxed text-muted-foreground">
            {paragraph}
          </p>
        ))}
      </section>

      {/* Ce que nous recommandons */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">{t(`${base}.recommend.title`)}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{t(`${base}.recommend.intro`)}</p>
        <ul className="ml-5 list-disc space-y-1.5 text-sm leading-relaxed text-muted-foreground">
          {list(`${base}.recommend.points`).map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ul>
        <p className="text-sm leading-relaxed text-muted-foreground">{t(`${base}.recommend.outro`)}</p>
      </section>

      {/* Structure */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">{t(`${base}.structure.title`)}</h2>
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
      </section>

      {/* Modèle d'email */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">{t(`${base}.template.title`)}</h2>
        <Card className="border bg-muted/40">
          <CardContent className="space-y-4 p-5">
            <p className="text-sm font-medium text-foreground">
              {t(`${base}.template.subjectLabel`)} : {templateSubject}
            </p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {templateBody}
            </p>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {t(`${base}.template.copy`)}
              </Button>
              {copied && (
                <span className="text-xs text-muted-foreground">{t(`${base}.template.copied`)}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* À éviter */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">{t(`${base}.avoid.title`)}</h2>
        <ul className="ml-5 list-disc space-y-1.5 text-sm leading-relaxed text-muted-foreground">
          {list(`${base}.avoid.points`).map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ul>
      </section>

      {/* À retenir */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">{t(`${base}.takeaways.title`)}</h2>
        <ul className="ml-5 list-disc space-y-1.5 text-sm leading-relaxed text-muted-foreground">
          {list(`${base}.takeaways.points`).map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ul>
      </section>

      {/* Étape suivante */}
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
              {t(`${base}.next.label`)}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
              {t(`${base}.next.label`)}
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </span>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
