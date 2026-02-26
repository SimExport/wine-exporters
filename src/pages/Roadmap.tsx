import { useState, useEffect } from "react";
import { Store, Megaphone, Calculator, FileText, Globe, ThumbsUp, Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const FEATURES = [
  {
    id: "marketplace",
    title: "Marketplace",
    icon: Store,
    description: "Connectez-vous directement aux importateurs via un catalogue de cuvées digital et interactif.",
  },
  {
    id: "tenders",
    title: "Appels d'Offres",
    icon: Megaphone,
    description: "Un outil simple qui liste tous les appels d'offres disponibles et vous propose d'y répondre de manière intuitive.",
  },
  {
    id: "calculator",
    title: "Calculateur Prix Export",
    icon: Calculator,
    description: "Sachez exactement à combien vendre vos vins sur quels marchés en intégrant taxes et marges.",
  },
  {
    id: "tech-sheets",
    title: "Générateur Fiches Techniques",
    icon: FileText,
    description: "Créez des fiches techniques modernes, adaptées et traduites automatiquement en plusieurs langues.",
  },
  {
    id: "market-guides",
    title: "Fiches Marchés",
    icon: Globe,
    description: "Guides détaillés par pays pour savoir où prospecter et comment pénétrer le marché.",
  },
];

const Roadmap = () => {
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
      toast({ title: "Erreur", description: "Impossible d'enregistrer votre vote.", variant: "destructive" });
    } else {
      setVotedFeatures((prev) => new Set([...prev, featureId]));
      setVoteCounts((prev) => ({ ...prev, [featureId]: (prev[featureId] || 0) + 1 }));
      toast({ title: "Merci pour votre vote !", description: "Votre intérêt a été enregistré." });
    }
    setLoading(null);
  };

  return (
    <div className="p-8 lg:p-10 space-y-10">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-foreground">Fonctionnalités à venir</h1>
        <p className="text-muted-foreground mt-3 text-lg">
          Découvrez nos projets pour accélérer votre export. Votez pour vos outils préférés !
        </p>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => {
          const voted = votedFeatures.has(feature.id);
          return (
            <Card key={feature.id} className="flex flex-col transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
              <CardHeader className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </div>
                <CardDescription>{feature.description}</CardDescription>
                {(voteCounts[feature.id] || 0) > 0 && (
                  <p className="mt-3 text-sm font-medium text-amber-600 dark:text-amber-400">
                    🔥 {voteCounts[feature.id]} vigneron{voteCounts[feature.id] > 1 ? 's' : ''} intéressé{voteCounts[feature.id] > 1 ? 's' : ''}
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
                      Voté !
                    </>
                  ) : (
                    <>
                      <ThumbsUp className="mr-2 h-4 w-4" />
                      Je suis intéressé
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
