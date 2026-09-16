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

const POLL_MS = 5000;
const MAX_POLL_MS = 4 * 60 * 1000;

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

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-10 sm:py-14">
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
            {/* Bloc 1 — en-tête */}
            <section className="space-y-3">
              <Badge variant="secondary" className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                {t("marketAnalysisResult.badge")}
              </Badge>
              <h1 className="font-display text-3xl sm:text-4xl">
                {t("marketAnalysisResult.title")}
              </h1>
              {shortlist.length > 0 && (
                <p className="text-lg text-muted-foreground">
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
                  <p className="text-muted-foreground">{t("marketAnalysisResult.empty.body")}</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Bloc 2 — synthèse */}
                {data.market_summary && (
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("marketAnalysisResult.summary.title")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                        {data.market_summary
                          .split(/\n{2,}|\n/)
                          .map((p) => p.trim())
                          .filter(Boolean)
                          .map((p, i) => (
                            <p key={i}>{p}</p>
                          ))}
                      </div>

                      {(data.recommended_approach ?? []).length > 0 && (
                        <>
                          <Separator />
                          <div className="space-y-3">
                            <h3 className="font-semibold">
                              {t("marketAnalysisResult.summary.approachTitle")}
                            </h3>
                            <ul className="space-y-2">
                              {(data.recommended_approach ?? []).map((r, i) => (
                                <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                    {i + 1}
                                  </span>
                                  {r}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Bloc 3 — shortlist */}
                <section className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="font-display text-2xl">
                      {t("marketAnalysisResult.shortlist.title", { count: shortlist.length })}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {t("marketAnalysisResult.shortlist.masked")}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {shortlist.map((item, i) => (
                      <Card key={`${item.company_name}-${i}`}>
                        <CardContent className="space-y-3 p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <h3 className="font-semibold">{item.company_name}</h3>
                              {(item.city || item.country) && (
                                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {[item.city, item.country].filter(Boolean).join(", ")}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline" className="border-primary/30 text-primary">
                              {t("marketAnalysisResult.shortlist.scoreLabel")} {item.score ?? "-"}/10
                            </Badge>
                          </div>

                          {item.reason && (
                            <p className="text-sm leading-relaxed text-muted-foreground">
                              {item.reason}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            {item.website_url && (
                              <a
                                href={
                                  item.website_url.startsWith("http")
                                    ? item.website_url
                                    : `https://${item.website_url}`
                                }
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                className="inline-flex items-center gap-1.5 text-primary hover:underline"
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
                    ))}
                  </div>
                </section>
              </>
            )}

            {/* Bloc 4 — repositionnement produit */}
            <section className="rounded-lg border border-primary/20 bg-primary/5 p-6 sm:p-8">
              <h2 className="font-display text-2xl">{t("marketAnalysisResult.product.title")}</h2>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
                <p>{t("marketAnalysisResult.product.body1")}</p>
                <p>{t("marketAnalysisResult.product.body2")}</p>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                {(t("marketAnalysisResult.product.steps", { returnObjects: true }) as string[]).map(
                  (step, i, arr) => (
                    <div key={step} className="flex items-center gap-2">
                      <span className="rounded-md bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
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

            {/* Bloc 5 — CTA */}
            <Card>
              <CardContent className="space-y-4 p-8 text-center">
                <h2 className="font-display text-2xl">{t("marketAnalysisResult.cta.title")}</h2>
                <p className="mx-auto max-w-xl text-sm text-muted-foreground">
                  {t("marketAnalysisResult.cta.body")}
                </p>
                <Button asChild size="lg" className="mt-2">
                  <Link to="/demande-demo">{t("marketAnalysisResult.cta.button")}</Link>
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default MarketAnalysisResult;
