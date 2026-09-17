import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRIES } from "@/components/importers/country-data";
import { StepWinery } from "@/components/market-analysis/StepWinery";
import { StepWines } from "@/components/market-analysis/StepWines";
import { StepMarket } from "@/components/market-analysis/StepMarket";
import { EMPTY_FORM, MarketAnalysisForm } from "@/components/market-analysis/options";

const TOTAL_STEPS = 3;
const MIN_FILL_SECONDS = 3;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MarketAnalysis = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<MarketAnalysisForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyRequested, setAlreadyRequested] = useState(false);
  // Anti-robots : champ piège invisible + délai minimum de remplissage.
  // Le piège ne compte que si une frappe réelle a eu lieu (évite les faux positifs
  // dus au remplissage automatique des navigateurs).
  const [honeypot, setHoneypot] = useState("");
  const honeypotTyped = useRef(false);
  const openedAt = useRef(Date.now());

  const update = <K extends keyof MarketAnalysisForm>(key: K, value: MarketAnalysisForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const validateStep = (current: number) => {
    const next: Record<string, string> = {};
    const req = t("marketAnalysis.errors.required");

    if (current === 1) {
      if (!form.winery_name.trim()) next.winery_name = req;
      if (!form.contact_name.trim()) next.contact_name = req;
      if (!form.email.trim()) next.email = req;
      else if (!EMAIL_RE.test(form.email.trim())) next.email = t("marketAnalysis.errors.email");
      if (!form.phone.trim()) next.phone = req;
      if (!form.website.trim()) next.website = req;
      if (!form.winery_location.trim()) next.winery_location = req;
    }
    if (current === 2) {
      if (form.wine_types.length === 0) next.wine_types = t("marketAnalysis.errors.selectOne");
      if (!form.appellations_cuvees.trim()) next.appellations_cuvees = req;
      if (!form.export_price_range) next.export_price_range = t("marketAnalysis.errors.selectOne");
    }
    if (current === 3) {
      if (!form.target_country) next.target_country = t("marketAnalysis.errors.selectCountry");
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const targetCountryName = useMemo(() => {
    const country = COUNTRIES.find((c) => c.code === form.target_country);
    return country ? country.englishName : form.target_country;
  }, [form.target_country]);

  const onSubmit = async () => {
    if (submitting) return;
    for (let s = 1; s <= 3; s++) {
      if (!validateStep(s)) {
        setStep(s);
        return;
      }
    }

    const tooFast = (Date.now() - openedAt.current) / 1000 < MIN_FILL_SECONDS;
    const trapped = honeypotTyped.current && honeypot.trim().length > 0;
    if (trapped || tooFast) {
      // Robot probable : on affiche la confirmation sans rien enregistrer.
      console.warn(
        "market-analysis: submission skipped (anti-bot)",
        trapped ? "honeypot" : "too-fast"
      );
      setSubmitted(true);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      // L'identifiant est généré côté navigateur : la table n'autorise que
      // l'INSERT (aucune lecture publique), donc on ne peut pas utiliser
      // `.select()` pour récupérer l'ID généré par la base.
      const searchId = crypto.randomUUID();
      // Email normalisé (trim + minuscules) : un index unique en base garantit
      // une seule analyse gratuite par adresse, même en cas de soumissions
      // simultanées ou d'appel direct à l'API.
      const normalizedEmail = form.email.trim().toLowerCase();
      const { error } = await supabase.from("prospect_market_searches").insert({
        id: searchId,
        winery_name: form.winery_name.trim(),
        contact_name: form.contact_name.trim(),
        email: normalizedEmail,
        phone: form.phone.trim(),
        website: form.website.trim(),
        winery_location: form.winery_location.trim(),
        wine_types: form.wine_types,
        appellations_cuvees: form.appellations_cuvees.trim(),
        export_price_range: form.export_price_range,
        certifications: form.certifications,
        target_country: targetCountryName,
        importer_preferences: form.importer_preferences,
        exclusions: null,
        additional_context: null,
        source: "market-analysis",
        referrer: typeof document !== "undefined" ? document.referrer || null : null,
      });
      if (error) {
        // 23505 = violation d'unicité : une analyse existe déjà pour cet email.
        if (error.code === "23505") {
          console.info("market-analysis: duplicate email submission blocked");
          setAlreadyRequested(true);
          return;
        }
        throw error;
      }

      // Déclenchement du traitement (workflow prospect dédié) puis redirection
      // vers la page de résultat, qui affiche l'état d'avancement.
      supabase.functions
        .invoke("process-prospect-market-analysis", {
          body: { prospect_market_search_id: searchId },
        })
        .catch((err) => console.error("market-analysis processing trigger failed", err));

      navigate(`/market-analysis/result/${searchId}`);
    } catch (err: any) {
      console.error("market-analysis insert failed", err);
      setSubmitError(err?.message || t("marketAnalysis.errors.submit"));
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitle = t(`marketAnalysis.step${step}.title`);
  const stepSubtitle = t(`marketAnalysis.step${step}.subtitle`, { defaultValue: "" });

  return (
    <div className="min-h-screen bg-cream/60">
      <SEO
        title={t("seo.marketAnalysis.title")}
        description={t("seo.marketAnalysis.description")}
        path="/market-analysis"
        noindex
      />

      <header className="border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-3xl items-center justify-between px-6">
          <Link to="/" className="flex items-center">
            <BrandLogo className="h-12 w-auto max-w-[240px]" />
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10 sm:py-14">
        {alreadyRequested ? (
          <Card>
            <CardContent className="space-y-5 p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">{t("marketAnalysis.alreadyRequested.title")}</h1>
              <p className="text-muted-foreground">{t("marketAnalysis.alreadyRequested.body")}</p>
              <div className="flex flex-col items-center gap-3">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <a
                    href="https://calendar.app.google/rfx7N1bBhJcbwyJg9"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("marketAnalysis.alreadyRequested.cta")}
                  </a>
                </Button>
                <Link to="/" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
                  {t("marketAnalysis.alreadyRequested.back")}
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : submitted ? (
          <Card>
            <CardContent className="space-y-4 p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">{t("marketAnalysis.success.title")}</h1>
              <p className="text-muted-foreground">{t("marketAnalysis.success.body")}</p>
              <Button asChild variant="outline" className="mt-2">
                <Link to="/">{t("marketAnalysis.success.backHome")}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>{t("marketAnalysis.stepLabel", { current: step, total: TOTAL_STEPS })}</span>
                <span>{Math.floor((step / TOTAL_STEPS) * 100)}%</span>
              </div>
              <Progress value={(step / TOTAL_STEPS) * 100} className="h-1.5" />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{stepTitle}</CardTitle>
                {stepSubtitle && <CardDescription>{stepSubtitle}</CardDescription>}
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (step < TOTAL_STEPS) goNext();
                    else onSubmit();
                  }}
                  className="space-y-8"
                >
                  {/* Champ piège anti-robots : invisible pour les visiteurs.
                      Nom neutre + autocomplétion désactivée pour éviter le
                      remplissage automatique des navigateurs. */}
                  <div className="absolute h-0 w-0 overflow-hidden opacity-0" aria-hidden="true">
                    <input
                      id="contact_reference"
                      name="contact_reference"
                      type="text"
                      tabIndex={-1}
                      autoComplete="new-password"
                      value={honeypot}
                      onKeyDown={() => {
                        honeypotTyped.current = true;
                      }}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </div>

                  <div key={step} className="animate-in fade-in slide-in-from-right-2 duration-200">
                    {step === 1 && <StepWinery form={form} errors={errors} update={update} />}
                    {step === 2 && <StepWines form={form} errors={errors} update={update} />}
                    {step === 3 && <StepMarket form={form} errors={errors} update={update} />}
                    
                  </div>

                  {submitError && <p className="text-sm text-destructive">{submitError}</p>}

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {step > 1 && (
                        <Button type="button" variant="outline" onClick={goBack} disabled={submitting}>
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          {t("common.back")}
                        </Button>
                      )}
                      <Button type="submit" size="lg" className="flex-1" disabled={submitting}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {step < TOTAL_STEPS
                          ? t("marketAnalysis.continue")
                          : submitting
                            ? t("marketAnalysis.submitting")
                            : t("marketAnalysis.submit")}
                        {step < TOTAL_STEPS && <ArrowRight className="ml-2 h-4 w-4" />}
                      </Button>
                    </div>

                    {step === TOTAL_STEPS && (
                      <>
                        <p className="text-sm text-muted-foreground">{t("marketAnalysis.submitHelp")}</p>
                        <p className="text-xs text-muted-foreground">{t("marketAnalysis.consent")}</p>
                      </>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default MarketAnalysis;
