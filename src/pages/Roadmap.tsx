import { useState, useEffect } from "react";
import { Store, Megaphone, Calculator, FileText, Globe, ThumbsUp, Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const FEATURES = [
  { id: "marketplace", icon: Store },
  { id: "tenders", icon: Megaphone },
  { id: "calculator", icon: Calculator },
  { id: "tech-sheets", icon: FileText },
  { id: "market-guides", icon: Globe },
] as const;

type StepStatus = "done" | "current" | "upcoming";
const STEP_STATUSES: StepStatus[] = [
  "done",
  "current",
  "upcoming",
  "upcoming",
  "upcoming",
  "upcoming",
  "upcoming",
];

const Roadmap = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [votedFeatures, setVotedFeatures] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchAllVotes = async () => {
      const { data } = await supabase.from("roadmap_votes").select("feature_id");
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((v) => {
          counts[v.feature_id] = (counts[v.feature_id] || 0) + 1;
        });
        setVoteCounts(counts);
      }
    };
    fetchAllVotes();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchVotes = async () => {
      const { data } = await supabase
        .from("roadmap_votes")
        .select("feature_id")
        .eq("user_id", user.id);
      if (data) {
        setVotedFeatures(new Set(data.map((v) => v.feature_id)));
      }
    };
    fetchVotes();
  }, [user]);

  const handleVote = async (featureId: string) => {
    if (!user) return;
    setLoading(featureId);
    const { error } = await supabase
      .from("roadmap_votes")
      .insert({ user_id: user.id, feature_id: featureId });

    if (error) {
      toast({ title: t("roadmap.voteError.title"), description: t("roadmap.voteError.description"), variant: "destructive" });
    } else {
      setVotedFeatures((prev) => new Set([...prev, featureId]));
      setVoteCounts((prev) => ({ ...prev, [featureId]: (prev[featureId] || 0) + 1 }));
      toast({ title: t("roadmap.voteSuccess.title"), description: t("roadmap.voteSuccess.description") });
    }
    setLoading(null);
  };

  const steps = (t("roadmap.timeline.steps", { returnObjects: true }) as Array<{ date: string; title: string }>) || [];
  const currentIndex = STEP_STATUSES.indexOf("current");
  const progressPct = steps.length > 1 ? (currentIndex / (steps.length - 1)) * 100 : 0;

  return (
    <div className="p-8 lg:p-10 space-y-10">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-foreground">{t("roadmap.title")}</h1>
        <p className="text-muted-foreground mt-3 text-lg">
          {t("roadmap.subtitle")}
        </p>
      </div>

      <section aria-label={t("roadmap.timeline.title")} className="rounded-xl border bg-card p-6 lg:p-10">
        <h2 className="text-2xl font-bold text-foreground mb-8">{t("roadmap.timeline.title")}</h2>

        {/* Desktop horizontal timeline */}
        <div className="hidden md:block">
          <div className="relative px-2">
            {/* Background line */}
            <div className="absolute left-0 right-0 top-[78px] h-0.5 bg-muted-foreground/25" />
            {/* Progress line */}
            <div
              className="absolute left-0 top-[78px] h-0.5 bg-primary transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
            <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
              {steps.map((step, idx) => {
                const status = STEP_STATUSES[idx] ?? "upcoming";
                return (
                  <li key={idx} className="flex flex-col items-center text-center px-2">
                    <span className="text-xs font-medium text-muted-foreground mb-3 h-8 flex items-end">
                      {step.date}
                    </span>
                    <span
                      className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full ${
                        status === "done"
                          ? "bg-primary"
                          : status === "current"
                          ? "bg-primary animate-pulse-ring ring-4 ring-primary/20"
                          : "border-2 border-muted-foreground/40 bg-background"
                      }`}
                      aria-label={t(`roadmap.timeline.status.${status}`)}
                    >
                      {status === "done" && <Check className="h-3 w-3 text-primary-foreground" />}
                    </span>
                    <span
                      className={`mt-4 text-sm font-semibold leading-snug max-w-[150px] ${
                        status === "upcoming" ? "text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {step.title}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* Mobile vertical timeline */}
        <ol className="md:hidden relative space-y-6 pl-8">
          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-muted-foreground/25" />
          <div
            className="absolute left-[11px] top-2 w-0.5 bg-primary transition-all duration-500"
            style={{ height: `calc(${progressPct}% - 0.5rem)` }}
          />
          {steps.map((step, idx) => {
            const status = STEP_STATUSES[idx] ?? "upcoming";
            return (
              <li key={idx} className="relative">
                <span
                  className={`absolute -left-8 top-1 flex h-5 w-5 items-center justify-center rounded-full ${
                    status === "done"
                      ? "bg-primary"
                      : status === "current"
                      ? "bg-primary animate-pulse-ring ring-4 ring-primary/20"
                      : "border-2 border-muted-foreground/40 bg-background"
                  }`}
                >
                  {status === "done" && <Check className="h-3 w-3 text-primary-foreground" />}
                </span>
                <p className="text-xs font-medium text-muted-foreground">{step.date}</p>
                <p
                  className={`text-sm font-semibold ${
                    status === "upcoming" ? "text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {step.title}
                </p>
              </li>
            );
          })}
        </ol>

        <p className="mt-8 text-xs italic text-muted-foreground text-center">
          {t("roadmap.timeline.disclaimer")}
        </p>
      </section>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => {
          const voted = votedFeatures.has(feature.id);
          const count = voteCounts[feature.id] || 0;
          return (
            <Card key={feature.id} className="flex flex-col transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
              <CardHeader className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{t(`roadmap.features.${feature.id}.title`)}</CardTitle>
                </div>
                <CardDescription>{t(`roadmap.features.${feature.id}.description`)}</CardDescription>
                {count > 0 && (
                  <p className="mt-3 text-sm font-medium text-amber-600 dark:text-amber-400">
                    {t(count > 1 ? "roadmap.interestedOther" : "roadmap.interestedOne", { count })}
                  </p>
                )}
              </CardHeader>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={voted ? "secondary" : "default"}
                  disabled={voted || loading === feature.id}
                  onClick={() => handleVote(feature.id)}
                >
                  {voted ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      {t("roadmap.voted")}
                    </>
                  ) : (
                    <>
                      <ThumbsUp className="mr-2 h-4 w-4" />
                      {t("roadmap.interested")}
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Roadmap;
