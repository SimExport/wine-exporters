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

  return (
    <div className="p-8 lg:p-10 space-y-10">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-foreground">{t("roadmap.title")}</h1>
        <p className="text-muted-foreground mt-3 text-lg">
          {t("roadmap.subtitle")}
        </p>
      </div>

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
