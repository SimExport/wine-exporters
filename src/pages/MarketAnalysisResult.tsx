import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Loader2,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";

type ShortlistItem = {
  company_name: string | null;
  city: string | null;
  country: string | null;
  website_url: string | null;
  score: number | null;
  reason: string | null;
};

type AnalysisResult = {
  status: string;
  winery_name: string | null;
  winery_location: string | null;
  export_price_range: string | null;
  target_country: string | null;
  shortlist?: ShortlistItem[];
  market_summary?: string | null;
  recommended_approach?: string[];
};

type ProductItem = {
  eyebrow: string;
  title: string;
  body: string;
};

type Testimonial = {
  quote: string;
  name: string;
  role: string;
};

type MarketProof = {
  winery: string;
  market: string;
  flag: string;
};

const POLL_MS = 5000;
const MAX_POLL_MS = 4 * 60 * 1000;

/** Nombre de paragraphes de synthèse affichés (le contenu backend reste inchangé).
 * Le découpage ne se fait que sur les doubles sauts de ligne : chaque "paragraphe"
 * est un vrai paragraphe rédigé, pas une simple ligne du texte. */
const MAX_SUMMARY_PARAGRAPHS = 2;

/** Position du CTA intermédiaire : après la 3e carte importateur. */
const MID_CTA_AFTER = 3;

/** Masques purement décoratifs : les vraies coordonnées ne sont jamais envoyées au navigateur. */
const MASKED_EMAIL = "m••••••@••••••.com";
const MASKED_PHONE = "+•• •• •• •• ••";

const MarketAnalysisResult = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const startedAt = useRef(Date.now());

  const load = useCallback(async () => {
    if (!id) return;
    const { data: res, error } = await supabase.functions.invoke(
      "get-prospect-market-analysis",
      { body: { prospect_market_search_id: id } },
    );
    if (error || !res || (res as any).error) {
      console.error("market-analysis result fetch failed", error, res);
      setNotFound(true);
      return;
    }
    setData(res as AnalysisResult);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const pending = data?.status === "new" || data?.status === "processing";

  useEffect(() => {
    if (!pending || notFound || timedOut) return;
    const timer = setInterval(() => {
      if (Date.now() - startedAt.current > MAX_POLL_MS) {
        setTimedOut(true);
        return;
      }
      load();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [pending, notFound, timedOut, load]);

  const retry = async () => {
    if (!id || retrying) return;
    setRetrying(true);
    setTimedOut(false);
    startedAt.current = Date.now();
    try {
      await supabase.functions.invoke("process-prospect-market-analysis", {
        body: { prospect_market_search_id: id },
      });
    } catch (err) {
      console.error("market-analysis retry failed", err);
    } finally {
      setRetrying(false);
      load();
    }
  };

  const shortlist = data?.shortlist ?? [];
  const failed = data?.status === "failed" || timedOut;
  const testimonials = t("marketAnalysisResult.testimonials.items", {
    returnObjects: true,
    defaultValue: [],
  }) as Testimonial[];
  const productItems = t("marketAnalysisResult.product.items", {
    returnObjects: true,
    defaultValue: [],
  }) as ProductItem[];
  const marketProofs = t("marketAnalysisResult.proof.items", {
    returnObjects: true,
    defaultValue: [],
  }) as MarketProof[];

  const demoCta = (
    <Button asChild size="lg" className="w-full sm:w-auto">
      <a
        href="https://calendar.app.google/rfx7N1bBhJcbwyJg9"
        target="_blank"
        rel="noopener noreferrer"
      >
        {t("marketAnalysisResult.cta.button")}
      </a>
    </Button>
  );

  const renderImporterCard = (item: ShortlistItem, i: number) => (
    <Card key={`${item.company_name}-${i}`}>
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h3 className="font-semibold leading-snug">{item.company_name}</h3>
            {(item.city || item.country) && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 break-words">
                  {[item.city, item.country].filter(Boolean).join(", ")}
                </span>
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-center rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <span className="font-display text-xl font-semibold leading-none text-primary">
              {item.score ?? "-"}
              <span className="text-xs font-normal text-muted-foreground">/10</span>
            </span>
            <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("marketAnalysisResult.shortlist.scoreLabel")}
            </span>
          </div>
        </div>

        {item.reason && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
              {t("marketAnalysisResult.shortlist.reasonLabel")}
            </p>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {item.reason}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          {item.website_url && (
            <a
              href={
                item.website_url.startsWith("http")
                  ? item.website_url
                  : `https://${item.website_url}`
              }
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t("marketAnalysisResult.shortlist.website")}
            </a>
          )}
          <span className="select-none">
            {t("marketAnalysisResult.shortlist.emailLabel")} : {MASKED_EMAIL}
          </span>
          <span className="select-none">
            {t("marketAnalysisResult.shortlist.phoneLabel")} : {MASKED_PHONE}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-cream/60">
      <SEO
        title={t("seo.marketAnalysisResult.title")}
        description={t("seo.marketAnalysisResult.description")}
        path={`/market-analysis/result/${id ?? ""}`}
        noindex
      />

      <header className="border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-4xl items-center justify-between px-6">
          <Link to="/" className="flex items-center">
            <BrandLogo className="h-12 w-auto max-w-[240px]" />
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-10 px-6 py-10 sm:py-14">
        {notFound ? (
          <Card>
            <CardContent className="space-y-2 p-10 text-center">
              <h1 className="text-2xl font-bold">{t("marketAnalysisResult.notFound.title")}</h1>
              <p className="text-muted-foreground">{t("marketAnalysisResult.notFound.body")}</p>
            </CardContent>
          </Card>
        ) : !data ? (
          <div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t("marketAnalysisResult.loading")}
          </div>
        ) : failed ? (
          <Card>
            <CardContent className="space-y-4 p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-7 w-7 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold">{t("marketAnalysisResult.failed.title")}</h1>
              <p className="text-muted-foreground">{t("marketAnalysisResult.failed.body")}</p>
              <Button onClick={retry} disabled={retrying} className="mt-2">
                {retrying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {retrying
                  ? t("marketAnalysisResult.failed.retrying")
                  : t("marketAnalysisResult.failed.retry")}
              </Button>
            </CardContent>
          </Card>
        ) : pending ? (
          <Card>
            <CardContent className="space-y-4 p-10 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <h1 className="text-2xl font-bold">{t("marketAnalysisResult.processing.title")}</h1>
              <p className="text-muted-foreground">{t("marketAnalysisResult.processing.step1")}</p>
              <p className="text-sm text-muted-foreground">
                {t("marketAnalysisResult.processing.step2")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Bloc 1 — header renforcé, compact */}
            <section className="space-y-4">
              <Badge variant="secondary" className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                {t("marketAnalysisResult.badge")}
              </Badge>
              <h1 className="font-display text-4xl leading-tight sm:text-5xl">
                {t("marketAnalysisResult.title")}
              </h1>
              {shortlist.length > 0 && (
                <p className="max-w-2xl text-lg font-medium leading-snug sm:text-xl">
                  {t("marketAnalysisResult.subtitle", {
                    count: shortlist.length,
                    market: data.target_country ?? "",
                  })}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {[
                  data.winery_name,
                  data.winery_location,
                  data.export_price_range
                    ? t("marketAnalysisResult.priceRange", { range: data.export_price_range })
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </section>

            {shortlist.length === 0 ? (
              <Card>
                <CardContent className="space-y-2 p-8">
                  <h2 className="text-xl font-semibold">{t("marketAnalysisResult.empty.title")}</h2>
                  <p className="max-w-2xl text-muted-foreground">{t("marketAnalysisResult.empty.body")}</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Bloc 2 — synthèse aérée */}
                {data.market_summary && (
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("marketAnalysisResult.summary.title")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      <div className="max-w-2xl space-y-4 text-[15px] leading-relaxed text-muted-foreground">
                          {data.market_summary
                            .split(/\n{2,}/)
                            .map((p) => p.trim())
                          .filter(Boolean)
                          .slice(0, MAX_SUMMARY_PARAGRAPHS)
                          .map((p, i) => (
                            <p key={i}>{p}</p>
                          ))}
                      </div>

                      {(data.recommended_approach ?? []).length > 0 && (
                        <>
                          <Separator />
                          <div className="space-y-4">
                            <h3 className="font-semibold">
                              {t("marketAnalysisResult.summary.approachTitle")}
                            </h3>
                            <div className="grid gap-3 sm:grid-cols-3">
                              {(data.recommended_approach ?? []).map((r, i) => (
                                <div
                                  key={i}
                                  className="flex gap-3 rounded-lg border border-border/60 bg-background p-4"
                                >
                                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                    {i + 1}
                                  </span>
                                  <p className="text-sm leading-relaxed text-muted-foreground">{r}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Bloc 3 — shortlist + CTA intermédiaire */}
                <section className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="font-display text-2xl">
                      {t("marketAnalysisResult.shortlist.title", { count: shortlist.length })}
                    </h2>
                    <p className="max-w-2xl text-xs text-muted-foreground">
                      {t("marketAnalysisResult.shortlist.masked")}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {shortlist.map((item, i) => (
                      <div key={`${item.company_name}-${i}`} className="space-y-4">
                        {renderImporterCard(item, i)}
                        {i === MID_CTA_AFTER - 1 && shortlist.length > MID_CTA_AFTER && (
                          <div className="space-y-4 py-2">
                            <section className="rounded-lg border border-border/70 bg-secondary/55 p-5 sm:p-6">
                              <h3 className="text-sm font-semibold text-foreground">
                                {t("marketAnalysisResult.testimonials.title")}
                              </h3>
                              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                {testimonials.map((testimonial) => (
                                  <figure
                                    key={testimonial.name}
                                    className="flex h-full flex-col justify-between rounded-md border border-border/60 bg-background/80 p-4"
                                  >
                                    <blockquote className="text-sm leading-relaxed text-foreground/80">
                                      “{testimonial.quote}”
                                    </blockquote>
                                    <figcaption className="mt-4 border-t border-border/50 pt-3">
                                      <p className="text-sm font-semibold text-foreground">
                                        {testimonial.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                                    </figcaption>
                                  </figure>
                                ))}
                              </div>
                            </section>

                            <div className="rounded-lg border border-border bg-background p-6 text-center sm:p-7">
                              <h3 className="font-display text-xl">
                                {t("marketAnalysisResult.midCta.title")}
                              </h3>
                              <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                                {t("marketAnalysisResult.midCta.body")}
                              </p>
                              <Button asChild variant="outline" size="sm" className="mt-4 w-full sm:w-auto">
                                <a
                                  href="https://calendar.app.google/rfx7N1bBhJcbwyJg9"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {t("marketAnalysisResult.midCta.button")}
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {/* Bloc 4 — parcours produit */}
            <section className="rounded-lg border border-primary/20 bg-primary/5 p-6 sm:p-9">
              <h2 className="max-w-2xl font-display text-2xl leading-snug sm:text-3xl">
                {t("marketAnalysisResult.product.title")}
              </h2>
              <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
                {t("marketAnalysisResult.product.subtitle")}
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                {productItems.map((item, i) => (
                  <article
                    key={item.eyebrow}
                    className={`rounded-md border border-border/70 bg-background p-5 ${
                      i < 3 ? "lg:col-span-2" : "lg:col-span-3"
                    }`}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                      {item.eyebrow}
                    </p>
                    <h3 className="mt-2 font-semibold leading-snug text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                  </article>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-2.5">
                {(t("marketAnalysisResult.product.steps", { returnObjects: true }) as string[]).map(
                  (step, i, arr) => (
                    <div key={step} className="flex items-center gap-2">
                      <span className="rounded-md bg-background px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm">
                        {step}
                      </span>
                      {i < arr.length - 1 && (
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                  ),
                )}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                {t("marketAnalysisResult.product.stepsNote")}
              </p>
            </section>

            {/* Bloc 5 — résultats obtenus */}
            <section className="space-y-5">
              <div className="max-w-3xl space-y-2">
                <h2 className="font-display text-2xl sm:text-3xl">
                  {t("marketAnalysisResult.proof.title")}
                </h2>
                <p className="text-[15px] leading-relaxed text-muted-foreground">
                  {t("marketAnalysisResult.proof.subtitle")}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {marketProofs.map((proof) => (
                  <Card key={proof.winery} className="h-full">
                    <CardContent className="flex h-full flex-col p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
                        {proof.winery}
                      </p>
                      <p className="mt-4 text-[11px] font-medium text-muted-foreground">
                        {t("marketAnalysisResult.proof.marketOpened")}
                      </p>
                      <p className="mt-1 text-sm font-medium leading-snug text-foreground">
                        <span className="mr-1.5" aria-hidden="true">{proof.flag}</span>
                        {proof.market}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Bloc 6 — CTA final */}
            <Card className="border-primary/25 bg-primary/5">
              <CardContent className="space-y-5 p-8 text-center sm:p-10">
                <h2 className="font-display text-2xl sm:text-3xl">
                  {t("marketAnalysisResult.cta.title")}
                </h2>
                <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground">
                  {t("marketAnalysisResult.cta.body")}
                </p>
                <div className="flex justify-center">{demoCta}</div>
                <p className="text-xs text-muted-foreground">
                  {t("marketAnalysisResult.cta.note")}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default MarketAnalysisResult;
