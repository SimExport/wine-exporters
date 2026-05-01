import { useTranslation } from "react-i18next";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  progress: { domain: boolean; markets: boolean; campaign: boolean };
  onResume: () => void;
  onDismiss: () => void;
}

export function OnboardingResumeBanner({ progress, onResume, onDismiss }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const done = [progress.domain, progress.markets, progress.campaign].filter(Boolean).length;
  const pct = (done / 3) * 100;

  const handleDismissForever = async () => {
    if (user) {
      localStorage.setItem("onboarding_completed", "true");
      await supabase.from("profiles").update({ onboarding_completed: true }).eq("user_id", user.id);
    }
    onDismiss();
  };

  return (
    <div className="relative rounded-xl border bg-gradient-to-r from-primary/5 via-background to-background p-4 sm:p-5 mb-6">
      <button
        onClick={handleDismissForever}
        className="absolute top-3 right-3 p-1 rounded hover:bg-muted text-muted-foreground"
        aria-label={t("common.close")}
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">{t("onboarding.resume.title")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t("onboarding.resume.subtitle", { done, total: 3 })}</p>
          <div className="flex items-center gap-2 mt-2 max-w-md">
            <Progress value={pct} className="h-1.5 flex-1" />
            <span className="text-xs tabular-nums text-muted-foreground">{Math.round(pct)}%</span>
          </div>
        </div>
        <Button size="sm" onClick={onResume} className="shrink-0">
          {t("onboarding.resume.cta")}
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}