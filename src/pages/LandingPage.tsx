import { Link } from "react-router-dom";
import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import pillarNetworkImg from "@/assets/pillar-network.png";
import pillarContactImg from "@/assets/pillar-contact.png";
import pillarSuiviImg from "@/assets/pillar-suivi.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger } from
"@/components/ui/accordion";
import {
  Grape,
  Search,
  MailQuestion,
  FileSpreadsheet,
  Database,
  Mail,
  Kanban,
  CheckCircle2,
  ArrowRight,
  Filter,
  Users,
  Send,
  Eye,
  Package,
  Clock } from
"lucide-react";

/* ─── Animation wrapper ─── */
const FadeIn = ({
  children,
  className = "",
  delay = 0
}: {children: React.ReactNode;className?: string;delay?: number;}) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: "easeOut" }}
      className={className}>

      {children}
    </motion.div>);

};

/* ─── Static config (icons + visuals) ─── */
const painPointsConfig = [
  { id: "search", icon: Search },
  { id: "silence", icon: MailQuestion },
  { id: "tracking", icon: FileSpreadsheet },
] as const;

const pillarsConfig = [
  { id: "step1", visual: pillarNetworkImg, bulletIcons: [Filter, Users], bulletKeys: ["bullet1", "bullet2"] },
  { id: "step2", visual: pillarContactImg, bulletIcons: [Send, Eye], bulletKeys: ["bullet1", "bullet2"] },
  { id: "step3", visual: pillarSuiviImg, bulletIcons: [Kanban, Package, Clock], bulletKeys: ["bullet1", "bullet2", "bullet3"] },
] as const;

/* ─── Pillar visual ─── */
const PillarVisual = ({ src }: {src: string;}) => {
  const { t } = useTranslation();
  return (
    <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-lg border border-border">
      <img src={src} alt={t('landingExtra.featurePreviewAlt')} className="w-full h-full object-fill" />
    </div>
  );
};


/* ─── Testimonials with expand ─── */
const testimonials = [
  { name: "Famille Petitjean", result: "Commandes sur la Norvège, les USA (Floride) et l'Autriche" },
  { name: "Potel-Aviron", result: "Ouverture de 2 marchés : Pays-Bas et Suisse" },
  { name: "Château Mouresse", result: "3 commandes : Danemark + Pays-Bas" },
  { name: "Clos des Garands", result: "3 commandes au Danemark" },
  { name: "Maison des Vins Margnat", result: "3 commandes sur la Grèce et le Royaume-Uni" },
  { name: "Maison Kieffer", result: "2 commandes sur le Danemark" },
  { name: "Vignobles Courty", result: "2 commandes aux Pays-Bas et 1 commande en Allemagne" },
  { name: "Champagne Cordeuil", result: "2 commandes en Estonie" },
  { name: "Domaine de Naisse", result: "A ouvert la Finlande" },
  { name: "Domaine Cialhol Gauran", result: "A ouvert le Danemark" },
  { name: "Château Jalousie Beaulieu", result: "A ouvert la Hongrie" },
  { name: "Château Paquette", result: "A ouvert le Danemark" },
  { name: "Vignoble Arbillons", result: "1 commande sur le Canada et 2 commandes à venir sur les USA" },
  { name: "Domaine Sibille", result: "1 commande en Italie et 1 commande à venir aux USA" },
  { name: "Château Moulin Caresse", result: "1 commande sur le Royaume-Uni" },
  { name: "Château la Grave", result: "1 commande sur le Royaume-Uni" },
  { name: "Domaine Vincent Spannagel", result: "1 commande en Hongrie" },
  { name: "Domaine François Cartier", result: "1 commande en Pologne et 1 commande à venir en Suède" },
  { name: "Banjo Vino", result: "1 commande en Suède, 2 commandes à venir au Danemark et en Norvège" },
  { name: "Affentaler Winzer", result: "1 commande sur le Danemark, 1 commande à venir en Suède et en Norvège" },
  { name: "Huber & Bléger", result: "2 commandes à venir sur les USA" },
  { name: "Domaine Maurice Schueller", result: "Commandes à venir en Suède et en Pologne" },
];

const TestimonialsGrid = () => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? testimonials : testimonials.slice(0, 6);

  return (
    <>
      <div className="grid md:grid-cols-2 gap-5">
        {visible.map((t, i) => (
          <FadeIn key={t.name} delay={(i % 4) * 0.05}>
            <Card className="h-full bg-background border border-border">
              <CardContent className="p-5 flex flex-col gap-1.5">
                <h3 className="text-sm font-bold">{t.name}</h3>
                <p className="text-primary font-medium text-sm leading-relaxed">{t.result}</p>
              </CardContent>
            </Card>
          </FadeIn>
        ))}
      </div>
      {!expanded && (
        <div className="flex justify-center mt-8">
          <Button variant="outline" onClick={() => setExpanded(true)}>
            {t("landing.testimonials.viewAll", { count: testimonials.length })}
          </Button>
        </div>
      )}
    </>
  );
};


/* ─── Page ─── */
const LandingPage = () => {
  const { t } = useTranslation();
  const inclusions = t("landing.pricing.inclusions", { returnObjects: true }) as string[];
  const faqs = t("landing.faq.items", { returnObjects: true }) as Array<{ q: string; a: string }>;
  const heroStats = [
    { value: "+100", label: t("landing.hero.stats.domains") },
    { value: "+260", label: t("landing.hero.stats.importers") },
    { value: "+24", label: t("landing.hero.stats.markets") },
  ];
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-primary rounded-lg p-1.5 flex items-center justify-center">
              <Grape className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-base text-foreground">WineExporters</span>
              <span className="text-xs text-muted-foreground">by ExportVins</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button asChild>
              <Link to="/demande-demo">{t("landing.nav.requestDemo")}</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth" className="text-muted-foreground">{t("landing.nav.signIn")}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── 1. HERO ── */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        {/* grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h60v60H0z' fill='none'/%3E%3Cpath d='M0 30h60M30 0v60' stroke='%23000' stroke-width='.5'/%3E%3C/svg%3E\")"
          }} />

        <div className="relative max-w-3xl mx-auto px-6 text-center py-24">
          <FadeIn>
            <Badge variant="secondary" className="mb-6 text-sm px-4 py-1.5">
              {t("landing.hero.badge")}
            </Badge>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-6">
              {t("landing.hero.titleLead")}{" "}
              <span className="text-primary underline decoration-primary/40 underline-offset-4">
                {t("landing.hero.titleHighlight")}
              </span>
            </h1>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed whitespace-pre-line">
              {t("landing.hero.subtitle")}
            </p>
          </FadeIn>
          <FadeIn delay={0.25}>
            <div className="flex items-center justify-center gap-8 sm:gap-12 border-t border-border pt-8 mb-10">
              {heroStats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl sm:text-3xl font-extrabold text-primary">{stat.value}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </FadeIn>
          <FadeIn delay={0.35}>
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" asChild className="text-lg px-8">
                  <Link to="/demande-demo">
                    {t("landing.hero.ctaPrimary")}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="text-lg px-8">
                  <a href="#method">{t("landing.hero.ctaSecondary")}</a>
                </Button>
              </div>
              <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("landing.hero.haveAccount")}
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── 2. PROBLÉMATIQUES ── */}
      <section className="py-24 bg-muted/50">
        <div className="max-w-6xl mx-auto px-6">
          <FadeIn>
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-14">
              {t("landing.pain.title")}
            </h2>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-8">
            {painPointsConfig.map((p, i) => <FadeIn key={p.id} delay={i * 0.1}>
                <Card className="h-full border-border bg-card transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
                  <CardContent className="p-8">
                    <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-5">
                      <p.icon className="h-6 w-6 text-destructive" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{t(`landing.pain.items.${p.id}.title`)}</h3>
                    <p className="text-muted-foreground leading-relaxed">{t(`landing.pain.items.${p.id}.text`)}</p>
                  </CardContent>
                </Card>
              </FadeIn>
            )}
          </div>
        </div>
      </section>

      {/* ── 3. PILIERS (Zigzag) ── */}
      <section id="method" className="py-24 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-6">
          <FadeIn>
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-20">
              {t("landing.method.title")}
            </h2>
          </FadeIn>

          <div className="space-y-28">
            {pillarsConfig.map((p, i) => {
              const reversed = i % 2 === 1;
              return (
                <FadeIn key={p.id}>
                  <div
                    className={`flex flex-col ${
                    reversed ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-12 lg:gap-16`
                    }>

                    {/* Text */}
                    <div className="flex-1 space-y-5">
                      <Badge variant="outline" className="text-xs tracking-widest font-semibold">
                        {t(`landing.method.${p.id}.step`)}
                      </Badge>
                      <h3 className="text-2xl sm:text-3xl font-bold leading-tight">
                        {t(`landing.method.${p.id}.title`)}
                      </h3>
                      <p className="text-muted-foreground text-lg leading-relaxed">
                        {t(`landing.method.${p.id}.text`)}
                      </p>
                      <ul className="space-y-4 pt-2">
                        {p.bulletKeys.map((bk, bi) => {
                          const BIcon = p.bulletIcons[bi];
                          const text = t(`landing.method.${p.id}.${bk}`);
                          return (
                            <li key={bk} className="flex items-start gap-3">
                              <CheckCircle2 className="h-5 w-5 text-primary mt-1 shrink-0" />
                              <span className="leading-relaxed">{text}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    {/* Visual */}
                    <div className="flex-1 w-full max-w-md lg:max-w-none">
                      <PillarVisual src={p.visual} />
                    </div>
                  </div>
                </FadeIn>);

            })}
          </div>
        </div>
      </section>

      {/* ── 4. SYNTHÈSE & EXPERTISE ── */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <FadeIn>
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              {t("landing.synthesis.title")}
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="text-lg leading-relaxed opacity-90 whitespace-pre-line">
              {t("landing.synthesis.text")}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── 4b. TÉMOIGNAGES ── */}
      <section className="py-24 bg-muted/50">
        <div className="max-w-6xl mx-auto px-6">
          <FadeIn>
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-3">
              {t("landing.testimonials.title")}
            </h2>
            <p className="text-center text-muted-foreground text-lg mb-14">
              {t("landing.testimonials.subtitle")}
            </p>
          </FadeIn>
          <TestimonialsGrid />
        </div>
      </section>

      {/* ── 5. TARIFS ── */}
      <section id="pricing" className="py-24 scroll-mt-20">
        <div className="max-w-2xl mx-auto px-6">
          <FadeIn>
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
              {t("landing.pricing.title")}
            </h2>
            <p className="text-center text-muted-foreground text-lg mb-14">
              {t("landing.pricing.subtitle")}
            </p>
          </FadeIn>

          <FadeIn delay={0.15}>
            <Card className="border-2 border-primary shadow-xl shadow-primary/10">
              <CardContent className="p-10">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">{t("landing.pricing.planName")}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-extrabold text-primary">199€</span>
                    <span className="text-muted-foreground text-lg">{t("landing.pricing.priceSuffix")}</span>
                  </div>
                  <Badge variant="secondary" className="mt-3">{t("landing.pricing.commitment")}</Badge>
                </div>
                <ul className="space-y-4 mb-10">
                  {inclusions.map((item) => <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                      <span>{item}</span>
                    </li>)}
                </ul>
                <Button size="lg" className="w-full text-lg" asChild>
                  <Link to="/demande-demo">{t("landing.pricing.ctaStart")}</Link>
                </Button>
                <p className="text-sm text-muted-foreground text-center mt-4">
                  {t("landing.pricing.founders")}
                </p>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </section>

      {/* ── 6. FAQ ── */}
      <section className="py-24 bg-muted/50">
        <div className="max-w-2xl mx-auto px-6">
          <FadeIn>
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
              {t("landing.faq.title")}
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((faq, i) =>
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="bg-card border border-border rounded-lg px-6">

                  <AccordionTrigger className="text-left font-semibold text-base">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </FadeIn>
        </div>
      </section>

      {/* ── 7. CTA FINAL + FOOTER ── */}
      <section className="py-24">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <FadeIn>
            <h2 className="text-3xl sm:text-4xl font-bold mb-8">
              {t("landing.finalCta.title")}
            </h2>
            <Button size="lg" asChild className="text-lg px-10">
              <Link to="/demande-demo">
                {t("landing.finalCta.button")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </FadeIn>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Grape className="h-4 w-4 text-primary" />
            {t("landing.footer.copyright")}
          </span>
          <div className="flex gap-6">
            <a href="mailto:contact@exportvins.com" className="hover:text-foreground transition-colors">
              {t("landing.footer.contact")}
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              {t("landing.footer.legal")}
            </a>
          </div>
        </div>
      </footer>
    </div>);

};

export default LandingPage;