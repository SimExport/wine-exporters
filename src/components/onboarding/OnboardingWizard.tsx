import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Grape, Target, Mail, Handshake, ArrowRight, Sparkles, X,
  Megaphone, Eye, UserCircle2, Rocket, CheckCircle2, BarChart3, Inbox, ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const LS_KEY = "onboarding_completed";

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
  const [profileCompletion, setProfileCompletion] = useState<number>(0);

  useEffect(() => {
    if (!user || !open) return;
    (async () => {
      const { data } = await supabase.from("profiles")
        .select("domain_name, contact_name, location, aoc, bottles_per_year, wine_types, grape_varieties, priority_markets, current_markets, target_buyer_description, description, website")
        .eq("user_id", user.id).maybeSingle();
      if (!data) { setProfileCompletion(0); return; }
      const arr = (v: any) => Array.isArray(v) ? v : (typeof v === "string" && v ? v.split(",").map(s => s.trim()).filter(Boolean) : []);
      const fields = [
        !!data.domain_name,
        !!data.contact_name,
        !!data.location,
        arr(data.aoc).length > 0,
        !!data.bottles_per_year,
        arr(data.wine_types).length > 0,
        arr(data.grape_varieties).length > 0,
        arr(data.priority_markets).length > 0,
        arr(data.current_markets).length > 0,
        !!data.target_buyer_description,
        !!data.description && (data.description as string).length >= 300,
        !!data.website,
      ];
      const done = fields.filter(Boolean).length;
      setProfileCompletion(Math.round((done / fields.length) * 100));
    })();
  }, [user, open]);

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
            {step === 1 && <StepCampaignConcept onNext={() => finishAndGo("/create-campaign")} onSkip={next} />}
            {step === 2 && <StepProfileTeaser pct={profileCompletion} onGo={() => finishAndGo("/profile")} onLater={next} />}
            {step === 3 && <StepReady onCampaign={() => finishAndGo("/create-campaign")} busy={busy} />}
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
                <Button variant="outline" onClick={next} disabled={busy}>
                  {t("onboarding.nextStep")}
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
  const promises = [
    { icon: Target, emoji: "🎯", label: t("onboarding.welcome.p1") },
    { icon: Mail, emoji: "📬", label: t("onboarding.welcome.p2") },
    { icon: Handshake, emoji: "🤝", label: t("onboarding.welcome.p3") },
  ];
  return (
    <div className="text-center space-y-8">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
        <Sparkles className="h-7 w-7 text-primary" />
      </div>
      <div className="space-y-3">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t("onboarding.welcome.title")}</h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">{t("onboarding.welcome.subtitle")}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
        {promises.map((p, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 flex flex-col gap-3">
            <div className="text-3xl" aria-hidden>{p.emoji}</div>
            <p className="text-sm font-medium text-foreground/90 leading-snug">{p.label}</p>
          </div>
        ))}
      </div>
      <Button size="lg" onClick={onNext} className="px-8">
        {t("onboarding.welcome.cta")}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function StepCampaignConcept({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const { t } = useTranslation();
  const flow = [
    { icon: Target, label: t("onboarding.campaign.f1") },
    { icon: ShieldCheck, label: t("onboarding.campaign.f2") },
    { icon: Mail, label: t("onboarding.campaign.f3") },
    { icon: Inbox, label: t("onboarding.campaign.f4") },
  ];
  return (
    <div className="space-y-7">
      <header className="text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-3">
          <Megaphone className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{t("onboarding.campaign.title")}</h2>
        <p className="text-muted-foreground mt-2">{t("onboarding.campaign.subtitle")}</p>
      </header>

      {/* Flow */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {flow.map((f, i) => (
          <div key={i} className="relative rounded-xl border bg-card p-4 flex flex-col items-center gap-2 text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <f.icon className="h-4 w-4 text-primary" />
            </div>
            <span className="text-xs font-medium text-foreground/80">{f.label}</span>
            {i < flow.length - 1 && (
              <ArrowRight className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            )}
          </div>
        ))}
      </div>

      {/* Mock campaign card */}
      <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{t("onboarding.campaign.mockLabel")}</p>
            <p className="font-semibold">{t("onboarding.campaign.mockTitle")}</p>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary">{t("onboarding.campaign.mockStatus")}</Badge>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("onboarding.campaign.mockMarkets")}</p>
          <div className="flex flex-wrap gap-1.5">
            {["🇬🇧 UK", "🇩🇪 Allemagne", "🇺🇸 USA", "🇯🇵 Japon"].map(m => (
              <Badge key={m} variant="outline" className="font-normal">{m}</Badge>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("onboarding.campaign.mockCuvees")}</p>
          <div className="flex flex-wrap gap-1.5">
            {["Cuvée Tradition 2022", "Réserve 2021"].map(c => (
              <Badge key={c} variant="outline" className="font-normal">{c}</Badge>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-3 border-t">
          <MockStat value="48" label={t("onboarding.campaign.mockStat1")} />
          <MockStat value="12" label={t("onboarding.campaign.mockStat2")} />
          <MockStat value="5" label={t("onboarding.campaign.mockStat3")} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <Button size="lg" onClick={onNext}>
          {t("onboarding.campaign.cta")}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <button onClick={onSkip} className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline inline-flex items-center gap-1">
          <Eye className="h-3 w-3" />
          {t("onboarding.campaign.example")}
        </button>
      </div>
    </div>
  );
}

function MockStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-xl font-bold text-primary">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}

function StepProfileTeaser({ pct, onGo, onLater }: { pct: number; onGo: () => void; onLater: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-7">
      <header className="text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-3">
          <UserCircle2 className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{t("onboarding.profile.title")}</h2>
        <p className="text-muted-foreground mt-2">{t("onboarding.profile.subtitle")}</p>
      </header>

      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t("onboarding.profile.completion")}</span>
          <span className="text-sm font-bold text-primary tabular-nums">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" />
        <p className="text-xs text-muted-foreground">{t("onboarding.profile.hint")}</p>
      </div>

      <div className="flex flex-col items-center gap-2">
        <Button size="lg" onClick={onGo}>
          {t("onboarding.profile.cta")}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <button onClick={onLater} className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
          {t("onboarding.profile.later")}
        </button>
      </div>
    </div>
  );
}

function StepReady({ onCampaign, busy }: { onCampaign: () => void; busy: boolean }) {
  const { t } = useTranslation();
  const items = [
    { icon: Megaphone, text: t("onboarding.ready.r1") },
    { icon: BarChart3, text: t("onboarding.ready.r2") },
    { icon: Inbox, text: t("onboarding.ready.r3") },
    { icon: CheckCircle2, text: t("onboarding.ready.r4") },
  ];
  return (
    <div className="space-y-7 text-center">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
        <Rocket className="h-7 w-7 text-primary" />
      </div>
      <div className="space-y-3">
        <h2 className="text-3xl font-bold tracking-tight">{t("onboarding.ready.title")} 🎉</h2>
        <p className="text-muted-foreground text-lg">{t("onboarding.ready.subtitle")}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-xl mx-auto text-left">
        {items.map((it, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <it.icon className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground/90">{it.text}</span>
          </div>
        ))}
      </div>
      <Button size="lg" onClick={onCampaign} disabled={busy} className="px-8">
        {t("onboarding.ready.cta")}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
