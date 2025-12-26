import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Grape, 
  Users, 
  Globe, 
  TrendingUp, 
  Mail, 
  Target, 
  BarChart3, 
  FileText, 
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Building2,
  MessageSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                <Grape className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">WineExporters</h1>
                <p className="text-xs text-muted-foreground">by ExportVins</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/auth">
                <Button variant="ghost">Se connecter</Button>
              </Link>
              <Link to="/auth">
                <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                  Commencer
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4" />
              Plateforme de prospection pour vignerons
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Développez vos exports <br />
              <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                vers le monde entier
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              La plateforme tout-en-un qui connecte les vignerons français aux importateurs internationaux. 
              Créez des campagnes ciblées et suivez vos prospects.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-lg px-8 py-6">
                  Démarrer gratuitement
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                Voir une démo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <p className="text-4xl font-bold text-purple-600 mb-2">15 000+</p>
              <p className="text-muted-foreground">Importateurs qualifiés</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-purple-600 mb-2">45+</p>
              <p className="text-muted-foreground">Pays couverts</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-purple-600 mb-2">500+</p>
              <p className="text-muted-foreground">Domaines utilisateurs</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-purple-600 mb-2">25%</p>
              <p className="text-muted-foreground">Taux de réponse moyen</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Tout ce dont vous avez besoin pour exporter
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Une suite complète d'outils pour identifier, contacter et convertir des importateurs qualifiés.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-6">
                  <Users className="h-7 w-7 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Base d'importateurs</h3>
                <p className="text-muted-foreground">
                  Accédez à notre base de données de 15 000+ importateurs qualifiés, mise à jour régulièrement.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-6">
                  <Target className="h-7 w-7 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Ciblage précis</h3>
                <p className="text-muted-foreground">
                  Filtrez par pays, type de vin recherché, volume et segment de marché pour un ciblage optimal.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-6">
                  <Mail className="h-7 w-7 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Campagnes email</h3>
                <p className="text-muted-foreground">
                  Créez et envoyez des campagnes personnalisées avec des séquences de relance automatiques.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
                  <MessageSquare className="h-7 w-7 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Suivi des prospects</h3>
                <p className="text-muted-foreground">
                  Gérez vos leads avec un CRM intégré : statuts, notes, demandes d'échantillons et plus.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-6">
                  <BarChart3 className="h-7 w-7 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Analytics détaillées</h3>
                <p className="text-muted-foreground">
                  Suivez vos performances : ouvertures, clics, réponses et conversions en temps réel.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-6">
                  <FileText className="h-7 w-7 text-rose-600" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Fiches marchés</h3>
                <p className="text-muted-foreground">
                  Téléchargez des analyses détaillées de chaque marché : réglementation, tendances, conseils.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Comment ça marche ?
            </h2>
            <p className="text-xl text-muted-foreground">
              3 étapes simples pour développer vos exports
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Créez votre profil</h3>
              <p className="text-muted-foreground">
                Renseignez votre domaine, vos vins et vos documents commerciaux (tarifs, fiches techniques).
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Lancez une campagne</h3>
              <p className="text-muted-foreground">
                Sélectionnez vos marchés cibles, personnalisez votre message et validez l'envoi.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Suivez vos leads</h3>
              <p className="text-muted-foreground">
                Recevez les réponses, gérez les demandes d'échantillons et convertissez vos prospects.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Tarifs transparents
            </h2>
            <p className="text-xl text-muted-foreground">
              Choisissez la formule adaptée à vos besoins
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="border-2 border-border hover:border-purple-300 transition-colors">
              <CardContent className="p-8">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-foreground mb-2">Abonnement</h3>
                  <p className="text-muted-foreground">Pour une prospection régulière</p>
                </div>
                <div className="mb-8">
                  <span className="text-5xl font-bold text-foreground">90€</span>
                  <span className="text-muted-foreground"> HT/mois</span>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-foreground">1 campagne par mois incluse</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-foreground">Accès complet à la base importateurs</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-foreground">Fiches marchés téléchargeables</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-foreground">CRM et suivi des prospects</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-foreground">Support prioritaire</span>
                  </li>
                </ul>
                <Link to="/auth" className="block">
                  <Button className="w-full" size="lg">Choisir l'abonnement</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium px-4 py-1 rounded-bl-lg">
                Populaire
              </div>
              <CardContent className="p-8">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-foreground mb-2">À la carte</h3>
                  <p className="text-muted-foreground">Flexibilité maximale</p>
                </div>
                <div className="mb-8">
                  <span className="text-5xl font-bold text-foreground">150€</span>
                  <span className="text-muted-foreground"> HT/campagne</span>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-foreground">Packs de 1 à 5 campagnes</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-foreground">Prix dégressif selon volume</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-foreground">Accès aux fiches pays sélectionnés</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-foreground">CRM et suivi des prospects</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-foreground">Sans engagement</span>
                  </li>
                </ul>
                <Link to="/auth" className="block">
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700" size="lg">
                    Commencer maintenant
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-purple-600 to-indigo-700">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Prêt à développer vos exports ?
          </h2>
          <p className="text-xl text-purple-100 mb-10 max-w-2xl mx-auto">
            Rejoignez les 500+ domaines qui utilisent WineExporters pour conquérir de nouveaux marchés.
          </p>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
              Créer mon compte gratuitement
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                <Grape className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">WineExporters</h1>
                <p className="text-xs text-muted-foreground">by ExportVins</p>
              </div>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2024 ExportVins. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
