import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEMO_URL } from "@/lib/seo-articles";

/** Ressources représentatives réservées aux utilisateurs (visiteurs non connectés). */
const TEASER_SLUGS = ["firstEmail", "followUpTemplates", "respondOpportunity", "sendSamples"] as const;

export const MembersResourcesTeaser = () => {
  const { t } = useTranslation();
  return (
    <section className="space-y-4 rounded-xl border bg-secondary/40 p-6">
      <div>
        <h2 className="mb-1 text-2xl font-bold text-foreground">{t("seoArticles.members.title")}</h2>
        <p className="text-muted-foreground">{t("seoArticles.members.subtitle")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {TEASER_SLUGS.map((slug) => {
          const base = `resources.essential.items.${slug}`;
          return (
            <Card key={slug} className="border bg-background">
              <CardContent className="p-4">
                <Badge variant="outline" className="mb-2 gap-1 border-primary/40 text-primary font-normal">
                  <Lock className="h-3 w-3" /> {t("seoArticles.members.badge")}
                </Badge>
                <h3 className="mb-1 text-sm font-semibold text-foreground">{t(`${base}.title`)}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{t(`${base}.description`)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button asChild>
          <a href={DEMO_URL} target="_blank" rel="noopener noreferrer">{t("seoArticles.members.demo")}</a>
        </Button>
        <Button asChild variant="outline">
          <Link to="/auth">{t("seoArticles.members.login")}</Link>
        </Button>
      </div>
    </section>
  );
};
