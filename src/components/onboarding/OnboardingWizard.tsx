import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Grape, Target, Mail, Handshake, ArrowRight, Sparkles, X,
  Megaphone, ShieldCheck, Inbox, UserCircle2, KanbanSquare, List, CheckCircle2,
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
    setBusy(true);
    try {
      await markCompleted();
      onComplete();
      navigate("/dashboard");
    } finally {
      setBusy(false);
    }
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
      <div className="min-h-screen flex flex-col relative">
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
            {step === 0 && <StepWelcome />}
            {step === 1 && <StepCampaignFlow />}
            {step === 2 && <StepCRM />}
            {step === 3 && (
              <StepProfile
                busy={busy}
                onGo={() => finishAndGo("/profile")}
                onLater={dismiss}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-background/80 backdrop-blur sticky bottom-0">
          <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <button
              onClick={dismiss}
              disabled={busy}
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline disabled:opacity-50"
            >
              {t("onboarding.skip")}
            </button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button variant="ghost" onClick={back} disabled={busy}>
                  {t("common.back")}
                </Button>
              )}
              {step < totalSteps - 1 && (
                <Button onClick={next} disabled={busy}>
                  {t("onboarding.nextStep")}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Close X */}
        <button
          onClick={dismiss}
          disabled={busy}
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

function StepWelcome() {
  const { t } = useTranslation();
  const promises = [
    { emoji: "🎯", icon: Target, label: t("onboarding.welcome.p1") },
    { emoji: "📬", icon: Mail, label: t("onboarding.welcome.p2") },
    { emoji: "🤝", icon: Handshake, label: t("onboarding.welcome.p3") },
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
    </div>
  );
}

function StepCampaignFlow() {
  const { t } = useTranslation();
  const steps = [
    { icon: Megaphone, title: t("onboarding.campaign.s1Title"), desc: t("onboarding.campaign.s1Desc") },
    { icon: ShieldCheck, title: t("onboarding.campaign.s2Title"), desc: t("onboarding.campaign.s2Desc") },
    { icon: Inbox, title: t("onboarding.campaign.s3Title"), desc: t("onboarding.campaign.s3Desc") },
  ];
  return (
    <div className="space-y-7">
      <header className="text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-3">
          <Megaphone className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t("onboarding.campaign.title")}</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">{t("onboarding.campaign.subtitle")}</p>
      </header>

      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="rounded-xl border bg-card p-5 flex gap-4 items-start">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className="h-4 w-4 text-primary" />
                <p className="font-semibold text-foreground">{s.title}</p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StepCRM() {
  const { t } = useTranslation();
  const statuses = [
    { label: t("onboarding.crm.st1"), color: "bg-muted text-foreground" },
    { label: t("onboarding.crm.st2"), color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    { label: t("onboarding.crm.st3"), color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    { label: t("onboarding.crm.st4"), color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  ];
  return (
    <div className="space-y-7">
      <header className="text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-3">
          <KanbanSquare className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t("onboarding.crm.title")}</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">{t("onboarding.crm.subtitle")}</p>
      </header>

      {/* Mock CRM kanban */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
          <Badge variant="secondary" className="gap-1.5"><KanbanSquare className="h-3 w-3" />{t("onboarding.crm.kanban")}</Badge>
          <Badge variant="outline" className="gap-1.5"><List className="h-3 w-3" />{t("onboarding.crm.list")}</Badge>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {statuses.map((s, i) => (
            <div key={i} className="rounded-lg bg-muted/40 p-2 space-y-2">
              <div className={`text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 ${s.color}`}>
                {s.label}
              </div>
              <div className="space-y-1.5">
                {Array.from({ length: i === 0 ? 3 : i === 3 ? 1 : 2 }).map((_, j) => (
                  <div key={j} className="rounded-md bg-card border p-2 space-y-1">
                    <div className="h-1.5 w-3/4 rounded bg-muted-foreground/20" />
                    <div className="h-1 w-1/2 rounded bg-muted-foreground/10" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{t("onboarding.crm.statusesLabel")}</p>
        <div className="flex flex-wrap items-center gap-2">
          {statuses.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`text-xs font-medium rounded px-2 py-0.5 ${s.color}`}>{s.label}</span>
              {i < statuses.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepProfile({ busy, onGo, onLater }: { busy: boolean; onGo: () => void; onLater: () => void }) {
  const { t } = useTranslation();
  const items = [
    t("onboarding.profile.f1"),
    t("onboarding.profile.f2"),
    t("onboarding.profile.f3"),
    t("onboarding.profile.f4"),
  ];
  return (
    <div className="space-y-7">
      <header className="text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-3">
          <UserCircle2 className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t("onboarding.profile.title")}</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">{t("onboarding.profile.subtitle")}</p>
      </header>

      <div className="rounded-2xl border bg-card p-6 space-y-3">
        <p className="text-sm font-medium text-foreground">{t("onboarding.profile.fillIntro")}</p>
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col items-center gap-3">
        <Button size="lg" onClick={onGo} disabled={busy} className="px-8">
          {t("onboarding.profile.cta")}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <button
          onClick={onLater}
          disabled={busy}
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline disabled:opacity-50"
        >
          {t("onboarding.profile.later")}
        </button>
      </div>
    </div>
  );
}
