import { Link } from "react-router-dom";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
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

/* ─── Data ─── */
const painPoints = [
{
  icon: Search,
  title: "La recherche interminable",
  text: "Trouver les bons contacts prend des heures, et les salons coûtent une fortune pour un ROI incertain."
},
{
  icon: MailQuestion,
  title: "Le silence radio",
  text: "Vos emails de prospection tombent dans les spams ou sont noyés dans la masse. Personne ne vous répond."
},
{
  icon: FileSpreadsheet,
  title: "Le suivi chaotique",
  text: "Le suivi des échantillons et des relances finit toujours par se perdre dans un fichier Excel interminable."
}];


const pillars = [
{
  step: "ÉTAPE 1",
  title: "Ne cherchez plus les acheteurs. Trouvez-les.",
  text: "Accédez à une base de données mondiale et qualifiée d'importateurs et de distributeurs.",
  bullets: [
  { icon: Filter, text: "Filtrage précis par marché et par type d'acheteur." },
  {
    icon: Users,
    text: "Recherche sur-mesure : Vous visez un marché précis ? Utilisez votre crédit mensuel. Nos experts analysent votre domaine et vos vins afin de vous livrer une sélection d'importateurs pertinents."
  }],

  visual: pillarNetworkImg
},
{
  step: "ÉTAPE 2",
  title: "Des campagnes qui génèrent enfin des réponses.",
  text: "Fini le démarchage à l'aveugle. Nous vous aidons à capter l'attention des décideurs grâce à une approche ciblée.",
  bullets: [
  { icon: Send, text: "Outil de création de campagnes intégré." },
  {
    icon: Eye,
    text: "Campagne Mensuelle gérée : Vous validez, nous envoyons. Nous optimisons la délivrabilité pour que votre message arrive en boîte de réception, pas dans les spams."
  }],

  visual: pillarContactImg
},
{
  step: "ÉTAPE 3",
  title: "Transformez vos prospects en clients.",
  text: "Un importateur demande vos tarifs ? Ne laissez plus aucune opportunité s'échapper.",
  bullets: [
  { icon: Kanban, text: "Pipeline visuel (CRM Kanban) dédié à la vente de vins à l'export." },
  { icon: Package, text: "Suivi des envois d'échantillons." },
  { icon: Clock, text: "Historique centralisé pour ne jamais oublier une relance." }],

  visual: pillarSuiviImg
}];


const inclusions = [
"Accès illimité aux bases de données",
"1 recherche sur-mesure / mois",
"1 campagne de prospection / mois",
"Accès complet au CRM",
"Support prioritaire"];


const faqs = [
{
  q: "Qu'est ce que la recherche sur-mesure ?",
  a: "C'est un service de conciergerie inclus. Vous choisissez un marché, nous cherchons pour vous 3 à 5 importateurs qui matchent parfaitement avec votre domaine."
},
{
  q: "Puis-je lancer plus d'une campagne par mois ?",
  a: "L'abonnement inclut l'envoi géré d'une campagne qualifiée pour garantir la qualité. Pour des besoins supérieurs, contactez-nous."
},
{
  q: "Y a-t-il un engagement ?",
  a: "Oui, 3 mois d'engagement. Ensuite l'abonnement à 199 € mensuel et sans engagement."
}];


/* ─── Pillar visual ─── */
const PillarVisual = ({ src }: {src: string;}) =>
<div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-lg border border-border">
    <img src={src} alt="Aperçu de la fonctionnalité" className="w-full h-full object-fill" />
  </div>;


/* ─── Page ─── */
const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <Grape className="h-6 w-6 text-primary" />
            ExportVins
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/auth">Se connecter</Link>
            </Button>
            <Button asChild>
              <Link to="/auth">Démarrer</Link>
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
              🍷 La plateforme tout-en-un pour les domaines viticoles      
            </Badge>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-6">
              L'export de vos vins,{" "}
              <span className="text-primary underline decoration-primary/40 underline-offset-4">
enfin simplifié.
              </span>
            </h1>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">Arrêtez de perdre du temps avec des annuaires obsolètes et des emails ignorés. Trouvez et signez les bons importateurs depuis une plateforme unique conçue pour les domaines viticoles.


            </p>
          </FadeIn>
          <FadeIn delay={0.3}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="text-lg px-8">
                <Link to="/auth">
                  Démarrer ma prospection
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-lg px-8">
                <a href="#method">Découvrir la méthode</a>
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── 2. PROBLÉMATIQUES ── */}
      <section className="py-24 bg-muted/50">
        <div className="max-w-6xl mx-auto px-6">
          <FadeIn>
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-14">
              L'export ne devrait pas être un parcours du combattant.
            </h2>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-8">
            {painPoints.map((p, i) => <FadeIn key={p.title} delay={i * 0.1}>
                <Card className="h-full border-border bg-card transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
                  <CardContent className="p-8">
                    <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-5">
                      <p.icon className="h-6 w-6 text-destructive" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{p.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{p.text}</p>
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
              Notre méthode en 3 étapes pour développer vos marchés.
            </h2>
          </FadeIn>

          <div className="space-y-28">
            {pillars.map((p, i) => {
              const reversed = i % 2 === 1;
              return (
                <FadeIn key={p.step}>
                  <div
                    className={`flex flex-col ${
                    reversed ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-12 lg:gap-16`
                    }>

                    {/* Text */}
                    <div className="flex-1 space-y-5">
                      <Badge variant="outline" className="text-xs tracking-widest font-semibold">
                        {p.step}
                      </Badge>
                      <h3 className="text-2xl sm:text-3xl font-bold leading-tight">
                        {p.title}
                      </h3>
                      <p className="text-muted-foreground text-lg leading-relaxed">
                        {p.text}
                      </p>
                      <ul className="space-y-4 pt-2">
                        {p.bullets.map((b) =>
                        <li key={b.text} className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-primary mt-1 shrink-0" />
                            <span className="leading-relaxed">{b.text}</span>
                          </li>
                        )}
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
              Une seule plateforme. Zéro friction. Et de l'humain.
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="text-lg leading-relaxed opacity-90">
              Notre plateforme remplace vos fichiers Excel, vos outils d'emailing complexes et vos recherches Google. 

Surtout, ce n'est pas qu'un logiciel : derrière chaque recherche sur-mesure et chaque campagne de prospection, notre équipe d'experts s'active pour vendre vos vins.            
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── 5. TARIFS ── */}
      <section id="pricing" className="py-24 scroll-mt-20">
        <div className="max-w-2xl mx-auto px-6">
          <FadeIn>
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
              Un investissement rentabilisé dès la première palette.
            </h2>
            <p className="text-center text-muted-foreground text-lg mb-14">
              Tout est inclus. Pas de coûts cachés.
            </p>
          </FadeIn>

          <FadeIn delay={0.15}>
            <Card className="border-2 border-primary shadow-xl shadow-primary/10">
              <CardContent className="p-10">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">WineExporters</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-extrabold text-primary">199€</span>
                    <span className="text-muted-foreground text-lg">HT / mois</span>
                  </div>
                  <Badge variant="secondary" className="mt-3">engagement 3 mois

                  </Badge>
                </div>
                <ul className="space-y-4 mb-10">
                  {inclusions.map((item) => <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                      <span>{item}</span>
                    </li>)}
                </ul>
                <Button size="lg" className="w-full text-lg" asChild>
                  <Link to="/auth">Créer mon compte</Link>
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
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
              Questions fréquentes
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
              Prêt à conquérir de nouveaux marchés ?
            </h2>
            <Button size="lg" asChild className="text-lg px-10">
              <Link to="/auth">
                Démarrer maintenant
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
            ExportVins © 2026 — L'outil de prospection des vignerons.
          </span>
          <div className="flex gap-6">
            <a href="mailto:contact@exportvins.com" className="hover:text-foreground transition-colors">
              Contact
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Mentions légales
            </a>
          </div>
        </div>
      </footer>
    </div>);

};

export default LandingPage;