import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import logoFull from "@/assets/logo-wineexporters.png.asset.json";
import logoMark from "@/assets/logo-mark.png.asset.json";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Clock,
  KanbanSquare,
  List,
  PlayCircle,
  Inbox,
  Megaphone } from
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

/* ─── Editorial building blocks ─── */
const Marquee = ({ items }: { items: string[] }) => {
  const sequence = [...items, ...items, ...items, ...items];
  return (
    <div className="bg-primary text-primary-foreground overflow-hidden py-4 sm:py-5 border-y border-primary">
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
            {sequence.map((item, i) => (
              <span key={`${copy}-${i}`} className="flex items-center">
                <span className="px-6 text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] whitespace-nowrap">
                  {item}
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-gold shrink-0" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const Punchline = ({ text, tone }: { text: string; tone: "cream" | "primary" }) => (
  <section
    className={`py-24 sm:py-32 px-6 ${
      tone === "cream" ? "bg-cream text-cream-foreground" : "bg-primary text-primary-foreground"
    }`}>
    <FadeIn>
      <p className="font-display max-w-5xl mx-auto text-center text-3xl sm:text-5xl lg:text-6xl leading-[1.15] font-semibold text-balance">
        {text}
      </p>
    </FadeIn>
  </section>
);

const BigStats = ({ items }: { items: Array<{ value: string; label: string }> }) => (
  <section className="py-20 sm:py-28">
    <div className="max-w-5xl mx-auto px-6 grid gap-14 sm:gap-8 sm:grid-cols-2">
      {items.map((s, i) => (
        <FadeIn key={s.value} delay={i * 0.1}>
          <div className="text-center">
            <div className="font-display text-gold text-6xl sm:text-8xl lg:text-[7rem] leading-none font-bold">
              {s.value}
            </div>
            <p className="mt-5 text-xs sm:text-sm uppercase tracking-[0.2em] text-primary font-semibold max-w-xs mx-auto">
              {s.label}
            </p>
          </div>
        </FadeIn>
      ))}
    </div>
  </section>
);

const painPointsConfig = [
  { id: "search", icon: Search },
  { id: "silence", icon: MailQuestion },
  { id: "tracking", icon: FileSpreadsheet },
] as const;

const pillarsConfig = [
  { id: "step1", bulletIcons: [Filter, Users], bulletKeys: ["bullet1", "bullet2"] },
  { id: "step2", bulletIcons: [Send, Eye], bulletKeys: ["bullet1", "bullet2"] },
  { id: "step3", bulletIcons: [Kanban, Package, Clock, Inbox], bulletKeys: ["bullet1", "bullet2", "bullet3", "bullet4"] },
] as const;

/* ─── Pillar mockups (real React components, hardcoded data) ─── */
const MOCK_IMPORTERS = [
  { name: "Vinos del Mundo", country: "Espagne", flag: "🇪🇸", type: "Rouge", status: "Nouveau", tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { name: "Tokyo Wine Co.", country: "Japon", flag: "🇯🇵", type: "Blanc", status: "Actif", tone: "bg-green-500/10 text-green-600 dark:text-green-400" },
  { name: "Nordic Cellars", country: "Suède", flag: "🇸🇪", type: "Rosé", status: "Actif", tone: "bg-green-500/10 text-green-600 dark:text-green-400" },
  { name: "Atlantic Imports", country: "USA", flag: "🇺🇸", type: "Rouge", status: "Nouveau", tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { name: "Berlin Vintage", country: "Allemagne", flag: "🇩🇪", type: "Pétillant", status: "Contacté", tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
];

const ImportersMock = () => (
  <div className="w-full rounded-2xl border bg-card shadow-lg overflow-hidden">
    <div className="p-4 border-b bg-muted/30 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          readOnly
          value="Rechercher un importateur…"
          className="pl-9 h-9 bg-background pointer-events-none"
        />
      </div>
      <Badge variant="outline" className="gap-1.5 self-start sm:self-auto">
        <Filter className="h-3 w-3" /> Marché : Tous
      </Badge>
    </div>
    <div className="divide-y">
      <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/20">
        <div className="col-span-5">Importateur</div>
        <div className="col-span-3 hidden sm:block">Pays</div>
        <div className="col-span-2 hidden sm:block">Type</div>
        <div className="col-span-7 sm:col-span-2 text-right">Statut</div>
      </div>
      {MOCK_IMPORTERS.map((imp, i) => (
        <div
          key={i}
          className={`grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm ${i >= 2 ? "hidden sm:grid" : ""}`}
        >
          <div className="col-span-5 font-medium truncate">{imp.name}</div>
          <div className="col-span-3 hidden sm:flex items-center gap-1.5 text-muted-foreground">
            <span>{imp.flag}</span>
            <span className="truncate">{imp.country}</span>
          </div>
          <div className="col-span-2 hidden sm:block text-muted-foreground">{imp.type}</div>
          <div className="col-span-7 sm:col-span-2 text-right">
            <span className={`inline-block text-[10px] font-semibold rounded px-2 py-0.5 ${imp.tone}`}>
              {imp.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const MOCK_CAMPAIGNS = [
  {
    title: "Export Premium — Asie",
    markets: ["🇯🇵 Japon", "🇸🇬 Singapour", "🇰🇷 Corée"],
    status: "Active",
    statusTone: "bg-green-500/10 text-green-600 dark:text-green-400",
    progress: 78,
    contacted: "18 importateurs contactés",
  },
  {
    title: "Bio & Biodynamie — Europe du Nord",
    markets: ["🇸🇪 Suède", "🇩🇰 Danemark", "🇳🇱 Pays-Bas"],
    status: "En cours",
    statusTone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    progress: 45,
    contacted: "7 importateurs contactés",
  },
  {
    title: "Cuvée Tradition — UK & USA",
    markets: ["🇬🇧 UK", "🇺🇸 USA"],
    status: "Terminée",
    statusTone: "bg-muted text-foreground",
    progress: 100,
    contacted: "24 mises en relation générées",
  },
];

const CampaignsMock = () => (
  <div className="w-full space-y-3">
    {MOCK_CAMPAIGNS.map((c, i) => (
      <div
        key={i}
        className={`rounded-xl border bg-card p-4 sm:p-5 shadow-sm space-y-3 ${i >= 2 ? "hidden sm:block" : ""}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Megaphone className="h-4 w-4 text-primary" />
            </div>
            <p className="font-semibold truncate">{c.title}</p>
          </div>
          <span className={`shrink-0 text-[10px] font-semibold rounded px-2 py-0.5 ${c.statusTone}`}>
            {c.status}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {c.markets.map(m => (
            <Badge key={m} variant="outline" className="font-normal">{m}</Badge>
          ))}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{c.contacted}</span>
            <span className="tabular-nums">{c.progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${c.progress}%` }}
            />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const KANBAN_STATUSES = [
  { label: "Contacté", tone: "bg-muted text-foreground", cards: [{ name: "Vinos del Mundo", flag: "🇪🇸" }, { name: "Berlin Vintage", flag: "🇩🇪" }] },
  { label: "Intéressé", tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400", cards: [{ name: "Tokyo Wine Co.", flag: "🇯🇵" }, { name: "Nordic Cellars", flag: "🇸🇪" }] },
  { label: "Négociation", tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400", cards: [{ name: "Atlantic Imports", flag: "🇺🇸" }] },
  { label: "Converti", tone: "bg-green-500/10 text-green-600 dark:text-green-400", cards: [{ name: "London Cellars", flag: "🇬🇧" }] },
];

const PipelineMock = () => (
  <div className="w-full rounded-2xl border bg-card p-4 shadow-lg">
    <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
      <Badge variant="secondary" className="gap-1.5"><KanbanSquare className="h-3 w-3" />Kanban</Badge>
      <Badge variant="outline" className="gap-1.5"><List className="h-3 w-3" />Liste</Badge>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {KANBAN_STATUSES.map((s, i) => (
        <div key={i} className="rounded-lg bg-muted/40 p-2 space-y-2 min-w-0">
          <div className={`text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 ${s.tone}`}>
            {s.label}
          </div>
          <div className="space-y-1.5">
            {s.cards.map((c, j) => (
              <div key={j} className="rounded-md bg-card border p-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span aria-hidden>{c.flag}</span>
                  <span className="font-medium truncate">{c.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const PillarVisual = ({ id }: { id: "step1" | "step2" | "step3" }) => {
  if (id === "step1") return <ImportersMock />;
  if (id === "step2") return <CampaignsMock />;
  return <PipelineMock />;
};


/* ─── Testimonials with expand ─── */
const testimonials = [
  { name: "Château de France", result: "Ouverture du marché allemand, première commande dès la première campagne." },
  { name: "Maison Kieffer", result: "Ouverture du marché danois." },
  { name: "Potel-Aviron", result: "Ouverture de trois marchés, Pays-Bas, Suisse et Pologne." },
  { name: "Domaine de Naisse", result: "Ouverture du marché finlandais." },
  { name: "Famille Petitjean", result: "Ouverture des marchés autrichien et américain." },
  { name: "Domaine François Cartier", result: "Ouverture du marché polonais." },
  { name: "Champagne Cordeuil Père & Fille", result: "Ouverture du marché estonien." },
  { name: "Domaine Sibille", result: "Ouverture du marché italien." },
];

const testimonialQuotes = [
  {
    quote:
      "La plateforme répond à un vrai besoin pour nous, et nous connaissons la valeur et la pertinence de l'approche de Simon.",
    author: "Mathilde, vigneronne en Alsace",
  },
  {
    quote:
      "Ce que j'apprécie le plus : la qualification des leads, tout comme la capacité de la plateforme à s'actualiser pour répondre au plus près de nos besoins.",
    author: "Arnaud, vigneron à Pessac-Léognan",
  },
];

const TestimonialsGrid = () => {
  return (
      <div className="grid md:grid-cols-2 gap-5">
        {testimonials.map((t, i) => (
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
  );
};


const DEMO_ID = "cmsisxkjk2b9wqmaa2mnkakvr";

const openDemo = () => (window as any).Supademo?.open?.(DEMO_ID);

const VideoCtaButton = ({
  label,
  className = "",
  variant,
}: {
  label: string;
  className?: string;
  variant?: "outline" | "secondary";
}) => (
  <Button size="lg" variant={variant} className={`text-lg px-8 ${className}`} onClick={openDemo}>
    <PlayCircle className="mr-2 h-5 w-5" />
    {label}
  </Button>
);

/* ─── Page ─── */
const LandingPage = () => {
  const { t } = useTranslation();

  useEffect(() => {
    const SRC = "https://script.supademo.com/supademo.js";
    if (document.querySelector(`script[src="${SRC}"]`)) return;
    const script = document.createElement("script");
    script.src = SRC;
    script.async = true;
    document.body.appendChild(script);
  }, []);
  const inclusions = t("landing.pricing.inclusions", { returnObjects: true }) as string[];
  const faqs = t("landing.faq.items", { returnObjects: true }) as Array<{ q: string; a: string }>;
  const marqueeItems = t("landing.marquee.items", { returnObjects: true }) as string[];
  const bigStats = t("landing.bigStats.items", { returnObjects: true }) as Array<{ value: string; label: string }>;
  const methodOverview = ["step0", "step1", "step2", "step3"] as const;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title={t("seo.landing.title")} description={t("seo.landing.description")} path="/" />
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              src={logoFull.url}
              alt="WineExporters by ExportVins"
              className="h-9 sm:h-10 w-auto"
              width={220}
              height={40}
            />
            <span className="hidden sm:inline text-xs text-muted-foreground border-l border-border pl-2">
              by ExportVins
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button onClick={openDemo} className="hidden sm:inline-flex">
              <PlayCircle className="mr-2 h-4 w-4" />
              {t("landing.hero.ctaVideo")}
            </Button>
            <Button variant="outline" asChild>
              <Link to="/demande-demo">{t("landing.nav.requestDemo")}</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth" className="text-muted-foreground">{t("landing.nav.signIn")}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
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
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6">
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
          <FadeIn delay={0.35}>
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <VideoCtaButton label={t("landing.hero.ctaPrimary")} />
                <Button size="lg" variant="outline" asChild className="text-lg px-8">
                  <Link to="/decouvrir">
                    {t("landing.hero.ctaSecondary")}
                  </Link>
                </Button>
              </div>
              <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("landing.hero.haveAccount")}
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── A. BANDEAU MARQUEE ── */}
      <Marquee items={marqueeItems} />

      {/* ── 2. PROBLÉMATIQUES ── */}
      <section className="py-24 bg-muted/50">
        <div className="max-w-6xl mx-auto px-6">
          <FadeIn>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-14">
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

      {/* ── B. PUNCHLINE PLEIN ÉCRAN ── */}
      <Punchline text={t("landing.punchline.one")} tone="cream" />

      {/* ── 3. PILIERS (Zigzag) ── */}
      <section id="method" className="py-24 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-6">
          <FadeIn>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-16">
              {t("landing.method.title")}
            </h2>
          </FadeIn>

          {/* Aperçu numéroté 01 → 04 */}
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 mb-24 border-t border-border pt-10">
            {methodOverview.map((id, i) => (
              <FadeIn key={id} delay={i * 0.08}>
                <div className="flex flex-col gap-3">
                  <span className="font-display text-5xl lg:text-6xl font-bold text-gold leading-none">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-display text-xl font-semibold leading-snug">
                    {t(`landing.method.${id}.title`)}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(`landing.method.${id}.text`)}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>

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
                      <span className="font-display block text-5xl sm:text-6xl font-bold text-gold leading-none">
                        {String(i + 2).padStart(2, "0")}
                      </span>
                      <h3 className="font-display text-2xl sm:text-3xl font-bold leading-tight">
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
                      <PillarVisual id={p.id} />
                    </div>
                  </div>
                </FadeIn>);

            })}
          </div>
        </div>
      </section>

      {/* ── C. COMPTEURS STATISTIQUES ── */}
      <BigStats items={bigStats} />

      {/* ── 4. SYNTHÈSE & EXPERTISE ── */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <FadeIn>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
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
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-3">
              {t("landing.testimonials.title")}
            </h2>
            <p className="text-center text-muted-foreground text-lg mb-14">
              {t("landing.testimonials.subtitle")}
            </p>
          </FadeIn>
          <TestimonialsGrid />
          <div className="grid md:grid-cols-2 gap-5 mt-10">
            {testimonialQuotes.map((q, i) => (
              <FadeIn key={q.author} delay={i * 0.05}>
                <Card className="h-full bg-background border border-border">
                  <CardContent className="p-6 flex flex-col gap-3">
                    <p className="text-base leading-relaxed italic">« {q.quote} »</p>
                    <p className="text-sm font-semibold text-primary">{q.author}</p>
                  </CardContent>
                </Card>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── D. PUNCHLINE PLEIN ÉCRAN (placeholder à valider) ── */}
      <Punchline text={t("landing.punchline.two")} tone="primary" />
      <div className="bg-primary pb-24 sm:pb-28 -mt-10 flex justify-center px-6">
        <VideoCtaButton label={t("landing.hero.ctaVideo")} variant="secondary" />
      </div>

      {/* ── 5. TARIFS ── */}
      <section id="pricing" className="py-24 scroll-mt-20">
        <div className="max-w-2xl mx-auto px-6">
          <FadeIn>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-4">
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
                <Button size="lg" className="w-full text-lg" onClick={openDemo}>
                  <PlayCircle className="mr-2 h-5 w-5" />
                  {t("landing.hero.ctaVideo")}
                </Button>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </section>

      {/* ── 6. FAQ ── */}
      <section className="py-24 bg-muted/50">
        <div className="max-w-2xl mx-auto px-6">
          <FadeIn>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-12">
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
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-8">
              {t("landing.finalCta.title")}
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <VideoCtaButton label={t("landing.hero.ctaVideo")} className="px-10" />
              <Button size="lg" variant="outline" asChild className="text-lg px-10">
                <Link to="/demande-demo">
                  {t("landing.finalCta.button")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <img src={logoMark.url} alt="WineExporters" className="h-6 w-auto" width={24} height={24} />
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