import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight, Compass, Handshake, Repeat } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Step { title: string; text: string; cta: string; href: string }

/** Découpage éditorial du parcours : intertitres au-dessus des cartes d'étapes. */
const PHASES: { key: string; from: number; to: number }[] = [
  { key: "preparation", from: 0, to: 3 },
  { key: "prospection", from: 3, to: 6 },
  { key: "suivi", from: 6, to: 7 },
];

const GettingStarted = () => {
  const { t } = useTranslation();
  const steps = (t("gettingStarted.steps", { returnObjects: true }) as Step[]) || [];
  const cycle = (t("gettingStarted.rhythmCycle", { returnObjects: true }) as string[]) || [];

  return (
    <div className="p-6 lg:p-10 max-w-4xl space-y-10">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/ressources" className="hover:text-foreground">{t("gettingStarted.breadcrumb")}</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{t("gettingStarted.title")}</span>
      </nav>

      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Compass className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">{t("gettingStarted.title")}</h1>
        </div>
        <p className="text-muted-foreground text-lg">{t("gettingStarted.subtitle")}</p>
      </div>

      <div className="space-y-9">
        {PHASES.map((phase) => {
          const slice = steps.slice(phase.from, phase.to);
          if (!slice.length) return null;
          return (
            <section key={phase.key} className="space-y-4">
              <div className="flex items-center gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t(`gettingStarted.phases.${phase.key}`)}
                </p>
                <span className="h-px flex-1 bg-border" aria-hidden="true" />
              </div>
              <ol className="space-y-4">
                {slice.map((s, j) => {
                  const i = phase.from + j;
                  return (
                    <li key={i}>
                      <Card className="border">
                        <CardContent className="flex gap-4 p-5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                            {i + 1}
                          </div>
                          <div className="flex-1 space-y-2">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("gettingStarted.stepLabel", { n: i + 1 })}</p>
                            <h2 className="text-lg font-semibold text-foreground">{s.title}</h2>
                            <p className="text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                            <Link to={s.href} className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                              {s.cta} <ArrowRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
        <div className="flex items-start gap-3">
          <Handshake className="h-6 w-6 shrink-0 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">{t("gettingStarted.notMarketplaceTitle")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("gettingStarted.notMarketplaceText")}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Repeat className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">{t("gettingStarted.rhythmTitle")}</h2>
        </div>
        <p className="text-muted-foreground leading-relaxed">{t("gettingStarted.rhythmText")}</p>
        {cycle.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-lg border border-border bg-secondary/40 px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("gettingStarted.rhythmCycleLabel")}
            </span>
            {cycle.map((item, i) => (
              <Fragment key={item}>
                {i > 0 && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />}
                <span className="text-sm font-medium text-foreground">{item}</span>
              </Fragment>
            ))}
          </div>
        )}
        <blockquote className="border-l-4 border-primary/40 bg-secondary/40 px-4 py-3 text-sm italic text-foreground">
          {t("gettingStarted.rhythmExample")}
        </blockquote>
      </div>

      <div className="flex flex-wrap gap-2">
        {steps.filter((s, i, a) => a.findIndex((x) => x.href === s.href) === i).map((s) => (
          <Button key={s.href} asChild variant="outline" size="sm">
            <Link to={s.href}>{s.cta}</Link>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default GettingStarted;
