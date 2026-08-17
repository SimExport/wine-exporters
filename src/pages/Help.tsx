import { BookOpen, MessageCircle, User, Grape, Megaphone, Users, Mail, ChevronRight, HelpCircle, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { SEO } from "@/components/SEO";

const STEP_ICONS = [User, Grape, Megaphone, Users] as const;
const FAQ_IDS = ["profil", "campagnes", "crm", "abonnement"] as const;

const Help = () => {
  const { t } = useTranslation();
  const steps = (t("help.steps", { returnObjects: true }) as { title: string; description: string }[]) || [];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_IDS.flatMap((sectionId) => {
      const qa = (t(`help.sections.${sectionId}.qa`, { returnObjects: true }) as { q: string; a: string }[]) || [];
      return qa.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      }));
    }),
  };

  return (
    <div className="p-8 lg:p-10 space-y-12 max-w-4xl">
      <SEO title={t("seo.help.title")} description={t("seo.help.description")} path="/help" jsonLd={faqJsonLd} />
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <HelpCircle className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">{t("help.title")}</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          {t("help.subtitle")}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => window.dispatchEvent(new Event('open-onboarding'))}
        >
          <Sparkles className="h-4 w-4 mr-2 text-primary" />
          {t("help.replayTutorial")}
        </Button>
      </div>

      {/* Premiers pas */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30">
            <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">{t("help.firstStepsHeading")}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {steps.map((step, idx) => {
            const Icon = STEP_ICONS[idx];
            return (
            <Card key={idx} className="relative overflow-hidden border hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    {Icon && <Icon className="h-4 w-4 text-primary" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("help.stepLabel", { n: idx + 1 })}</span>
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">{step.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </CardContent>
              <div className="absolute top-0 left-0 h-full w-1 bg-primary/20" />
            </Card>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/30">
            <MessageCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">{t("help.faqHeading")}</h2>
        </div>
        <div className="space-y-4">
          {FAQ_IDS.map((sectionId) => {
            const qa = (t(`help.sections.${sectionId}.qa`, { returnObjects: true }) as { q: string; a: string }[]) || [];
            return (
            <Card key={sectionId}>
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {t(`help.sections.${sectionId}.title`)}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <Accordion type="multiple" className="w-full">
                  {qa.map((item, i) =>
                <AccordionItem key={i} value={`${sectionId}-${i}`} className="border-b last:border-b-0">
                      <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-3 text-left">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground pb-3 leading-relaxed">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                )}
                </Accordion>
              </CardContent>
            </Card>
            );
          })}
        </div>
      </section>

      {/* Contact */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-900/30">
            <Mail className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">{t("help.contactHeading")}</h2>
        </div>
        <Card className="border-emerald-200/50 dark:border-emerald-800/30 bg-emerald-50/40 dark:bg-emerald-900/10">
          <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <Mail className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">{t("help.contactTitle")}</h3>
              <p
                className="text-sm text-muted-foreground mt-1"
                dangerouslySetInnerHTML={{ __html: t("help.contactBody") }}
              />
            </div>
            <Button asChild className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white">
              <a href="mailto:support@exportvins.com">
                <Mail className="mr-2 h-4 w-4" />
                {t("help.contactCTA")}
                <ChevronRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>);

};

export default Help;