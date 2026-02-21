import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Grape, Database, Mail, Kanban, CheckCircle2, ArrowRight } from "lucide-react";

const pillars = [
  {
    icon: Database,
    title: "Où trouver des acheteurs qualifiés ?",
    text: "Accédez à notre base de données mondiale d'importateurs et distributeurs. Vous visez un marché précis ? Utilisez votre crédit mensuel pour demander une sélection sur-mesure adaptée à vos vins.",
  },
  {
    icon: Mail,
    title: "Comment capter leur attention ?",
    text: "Fini les e-mails ignorés. Validez une campagne de prospection par mois : nous nous chargeons de l'envoi ciblé et professionnel pour générer des demandes de tarifs ou d'échantillons.",
  },
  {
    icon: Kanban,
    title: "Comment ne perdre aucune vente ?",
    text: "Retrouvez toutes les réponses positives directement dans votre CRM intégré. Suivez l'avancée de vos négociations, de la prise de contact jusqu'à la première commande.",
  },
];

const inclusions = [
  "Accès complet à la base d'importateurs mondiale",
  "1 recherche sur-mesure experte par mois (3 à 5 contacts ultra-qualifiés)",
  "1 campagne de prospection par mois (envoi géré par nos soins)",
  "Accès illimité au CRM et suivi des leads",
  "Fiches marchés et stratégies d'approche",
];

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-foreground">
            <Grape className="h-6 w-6 text-purple-600" />
            ExportVins
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/auth">Se connecter</Link>
            </Button>
            <Button asChild className="bg-purple-600 hover:bg-purple-700">
              <Link to="/auth">Démarrer ma prospection</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-indigo-600">
          La plateforme tout-en-un pour développer vos ventes à l'export.
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Ne perdez plus de temps à chercher des contacts. ExportVins rassemble vos bases de données, vos campagnes de prospection et votre suivi client sur une seule plateforme pensée pour les vignerons.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" asChild className="bg-purple-600 hover:bg-purple-700 text-lg px-8">
            <Link to="/auth">
              Démarrer ma prospection <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="text-lg px-8">
            <a href="#pricing">Voir les tarifs</a>
          </Button>
        </div>
      </section>

      {/* 3 Piliers */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-foreground mb-14">
          L'export simplifié, de la recherche à la commande
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {pillars.map((p) => (
            <Card key={p.title} className="bg-card border-border transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
              <CardContent className="p-8">
                <div className="h-14 w-14 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mb-6">
                  <p.icon className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{p.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{p.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Preuve & Expertise */}
      <section className="bg-purple-100/60 dark:bg-purple-900/20 py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
            L'humain au cœur de la tech.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            ExportVins n'est pas qu'un logiciel automatique. Derrière chaque sourcing sur-mesure et chaque validation de campagne, nos experts en export de vins vérifient la cohérence de votre démarche pour maximiser vos chances de succès.
          </p>
        </div>
      </section>

      {/* Tarification */}
      <section id="pricing" className="max-w-2xl mx-auto px-6 py-24 scroll-mt-20">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-foreground mb-12">
          Un tarif simple et transparent
        </h2>
        <Card className="border-purple-300 dark:border-purple-700 shadow-xl shadow-purple-200/40 dark:shadow-purple-900/30">
          <CardContent className="p-10">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-foreground mb-2">Abonnement ExportVins</h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-extrabold text-purple-600">199€</span>
                <span className="text-muted-foreground text-lg">HT / mois</span>
              </div>
              <Badge variant="secondary" className="mt-3">Sans engagement</Badge>
            </div>
            <ul className="space-y-4 mb-10">
              {inclusions.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
            <Button size="lg" className="w-full bg-purple-600 hover:bg-purple-700 text-lg" asChild>
              <Link to="/auth">Créer mon compte</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>ExportVins © 2026 — L'outil de prospection des vignerons.</span>
          <div className="flex gap-6">
            <a href="mailto:contact@exportvins.com" className="hover:text-foreground transition-colors">Contact</a>
            <a href="#" className="hover:text-foreground transition-colors">Mentions légales</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
