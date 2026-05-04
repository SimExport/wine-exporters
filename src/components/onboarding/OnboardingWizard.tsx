import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Grape, Globe, Megaphone, CheckCircle2, ArrowRight, Sparkles, X,
  User, ListChecks, ShieldCheck, BarChart3, Inbox,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const LS_KEY = "onboarding_completed";

const MARKETS = [
  { id: "scandinavia", emoji: "🇸🇪", labelKey: "markets.scandinavia" },
  { id: "benelux", emoji: "🇧🇪", labelKey: "markets.benelux" },
  { id: "dach", emoji: "🇩🇪", labelKey: "markets.dach" },
  { id: "uk", emoji: "🇬🇧", labelKey: "markets.uk" },
  { id: "usa_canada", emoji: "🇺🇸", labelKey: "markets.usaCanada" },
  { id: "asia", emoji: "🇯🇵", labelKey: "markets.asia" },
];

interface OnboardingWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  initialStep?: number;
}

export function OnboardingWizard({ open, onClose, onComplete, initialStep = 0 }: OnboardingWizardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(initialStep);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const totalSteps = 4;
  const progress = ((step + 1) / totalSteps) * 100;

  const markCompleted = async () => {
    localStorage.setItem(LS_KEY, "true");
    if (user) {
      await supabase.from("profiles").update({
        onboarding_completed: true,
        onboarding_dismissed_at: null,
      }).eq("user_id", user.id);
    }
  };

  const dismiss = async () => {
    if (user) {
      await supabase.from("profiles").update({
        onboarding_dismissed_at: new Date().toISOString(),
      }).eq("user_id", user.id);
    }
    onClose();
  };

  const finishAndGo = async (path: string) => {
    setBusy(true);
    try {
      await markCompleted();
      onComplete();
      navigate(path);
    } finally {
      setBusy(false);
    }
  };

  const next = () => setStep(s => Math.min(s + 1, totalSteps - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen flex flex-col">
        {/* Top progress */}
        <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
          <div className="max-w-3xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Grape className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold">{t("onboarding.brand")}</span>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {t("onboarding.stepCounter", { current: step + 1, total: totalSteps })}
              </span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-2xl">
            {step === 0 && <StepWelcome onNext={next} />}
            {step === 1 && (
              <StepProfileGuide
                onGo={() => finishAndGo("/profile")}
                busy={busy}
              />
            )}
            {step === 2 && (
              <StepMarketsGuide
                onGo={() => finishAndGo("/profile")}
                busy={busy}
              />
            )}
            {step === 3 && (
              <StepCampaignGuide
                onCampaign={() => finishAndGo("/create-campaign")}
                onDashboard={() => finishAndGo("/dashboard")}
                busy={busy}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        {step < 3 && (
          <div className="border-t bg-background/80 backdrop-blur sticky bottom-0">
            <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
              <button
                onClick={dismiss}
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              >
                {t("onboarding.skip")}
              </button>
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <Button variant="ghost" onClick={back} disabled={busy}>
                    {t("common.back")}
                  </Button>
                )}
                <Button onClick={step === 0 ? next : next} disabled={busy}>
                  {step === 0 ? t("onboarding.start") : t("onboarding.nextStep")}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Close X */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 p-2 rounded-md hover:bg-muted text-muted-foreground"
          aria-label={t("common.close")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ---------- Steps ---------- */

function StepWelcome({ onNext }: { onNext: () => void }) {
  const { t } = useTranslation();
  const items = [
    { icon: Grape, label: t("onboarding.welcome.s1") },
    { icon: Globe, label: t("onboarding.welcome.s2") },
    { icon: Megaphone, label: t("onboarding.welcome.s3") },
    { icon: CheckCircle2, label: t("onboarding.welcome.s4") },
  ];
  return (
    <div className="text-center space-y-8">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
        <Sparkles className="h-7 w-7 text-primary" />
      </div>
      <div className="space-y-3">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t("onboarding.welcome.title")} 🍷</h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">{t("onboarding.welcome.subtitle")}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-xl mx-auto">
        {items.map((it, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 flex flex-col items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <it.icon className="h-4 w-4 text-primary" />
            </div>
            <span className="text-xs font-medium text-foreground/80 text-center">{it.label}</span>
          </div>
        ))}
      </div>
      <Button size="lg" onClick={onNext} className="px-8">
        {t("onboarding.start")}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function StepProfileGuide({ onGo, busy }: { onGo: () => void; busy: boolean }) {
  const { t } = useTranslation();
  const bullets = [
    { icon: User, text: t("onboarding.step2.b1") },
    { icon: Grape, text: t("onboarding.step2.b2") },
    { icon: BarChart3, text: t("onboarding.step2.b3") },
    { icon: ShieldCheck, text: t("onboarding.step2.b4") },
  ];
  return (
    <div className="space-y-7">
      <header className="text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-3">
          <User className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{t("onboarding.step2.title")}</h2>
        <p className="text-muted-foreground mt-2">{t("onboarding.step2.subtitle")}</p>
      </header>

      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <p className="text-sm font-medium">{t("onboarding.step2.intro")}</p>
        <ul className="space-y-3">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <b.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm text-foreground/90 pt-1.5">{b.text}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground italic pt-2 border-t">{t("onboarding.step2.tip")}</p>
      </div>

      <div className="flex justify-center">
        <Button size="lg" onClick={onGo} disabled={busy}>
          {t("onboarding.step2.ctaGo")}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function StepMarketsGuide({ onGo, busy }: { onGo: () => void; busy: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-7">
      <header className="text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-3">
          <Globe className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{t("onboarding.step3.title")}</h2>
        <p className="text-muted-foreground mt-2">{t("onboarding.step3.subtitle")}</p>
      </header>

      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <p className="text-sm font-medium">{t("onboarding.step3.preview")}</p>
        <div className="flex flex-wrap gap-2">
          {MARKETS.map(m => (
            <Badge key={m.id} variant="secondary" className="text-sm py-1.5 px-3 font-normal">
              <span className="mr-1.5">{m.emoji}</span>
              {t(`onboarding.${m.labelKey}`)}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        <Button size="lg" onClick={onGo} disabled={busy}>
          {t("onboarding.step3.ctaGo")}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function StepCampaignGuide({
  onCampaign, onDashboard, busy,
}: { onCampaign: () => void; onDashboard: () => void; busy: boolean }) {
  const { t } = useTranslation();
  const items = [
    { icon: ShieldCheck, text: t("onboarding.step4.c1") },
    { icon: BarChart3, text: t("onboarding.step4.c2") },
    { icon: Inbox, text: t("onboarding.step4.c3") },
  ];
  return (
    <div className="space-y-7">
      <header className="text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-3">
          <Megaphone className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{t("onboarding.step4.title")}</h2>
        <p className="text-muted-foreground mt-2">{t("onboarding.step4.subtitle")}</p>
      </header>

      <div className="rounded-2xl border bg-card p-6">
        <ul className="space-y-3">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <it.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm text-foreground/90 pt-1.5">{it.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button size="lg" onClick={onCampaign} disabled={busy} className="sm:order-2">
          {t("onboarding.step4.ctaCampaign")}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button size="lg" variant="outline" onClick={onDashboard} disabled={busy} className="sm:order-1">
          {t("onboarding.step4.ctaDashboard")}
        </Button>
      </div>
    </div>
  );
}
