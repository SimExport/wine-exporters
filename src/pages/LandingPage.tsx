import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Grape, Users, Globe, Mail, Kanban, CheckCircle2, ArrowRight, UserCheck, FileText, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
const LandingPage = () => {
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Grape className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Wine Exporters </h1>
                <p className="text-xs text-muted-foreground">by ExportVins </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/auth">
                <Button variant="ghost">Se connecter</Button>
              </Link>
              <Link to="/auth">
                <Button className="bg-primary hover:bg-primary/90">
                  Demander une démo
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-primary text-sm font-medium mb-8">
              <Compass className="h-4 w-4" />
              Plateforme de prospection pour les domaines viticoles       
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight text-primary">Prospectez, trouvez des acheteurs pour vos vins
            <br />
              
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              La solution clé en main pour les domaines viticoles qui souhaitent prospecter efficacement sur les marchés export.         
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8 py-6">
                  Demander une démo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <p className="text-4xl font-bold text-primary mb-2">15 000+</p>
              <p className="text-muted-foreground">Importateurs et acheteurs</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-primary mb-2">45+</p>
              <p className="text-muted-foreground">Pays couverts</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-primary mb-2">70+</p>
              <p className="text-muted-foreground">Domaines accompagnés</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - 3 Pillars */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Pourquoi choisir notre plateforme ?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Accédez à notre réseau d'importateurs et acheteurs, laissez-nous gérer vos campagnes de prospection et convertissez les opportunités en commandes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-6">
                  <Globe className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Une base de données avec plus de      15 000 acheteurs</h3>
                <p className="text-muted-foreground">Ne perdez plus de temps à chercher des contacts. Accédez instantanément à notre liste exhaustive d'importateurs, distributeurs et acheteurs clés dans le monde.</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-6">
                  <Mail className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Une campagne par mois, nous gérons la prospection pour vous</h3>
                <p className="text-muted-foreground">Ajoutez vos infos dans votre profil et lancez votre campagne mensuelle en quelques clics. Notre équipe crée pour vous des emails optimisés qui vont convaincre les acheteurs de sélectionner vos vins. </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-6">
                  <Kanban className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Un CRM pour transformer les opportunités en commandes</h3>
                <p className="text-muted-foreground">
                  Centralisez tout votre suivi sur notre plateforme. Notre équipe ajoute directement les acheteurs intéressés dans votre CRM.  Vous utilisez ensuite votre CRM pour suivre l'avancée des négociations, ajoutez vos notes et transformer les opportunités en commandes.    
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
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold flex items-center justify-center mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Créez votre profil</h3>
              <p className="text-muted-foreground">
                Renseignez vos informations dans votre profil, ajoutez vos cuvées, vos préférences et vos documents. 
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold flex items-center justify-center mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Activez votre campagne</h3>
              <p className="text-muted-foreground">
                Chaque mois, définissez les paramètres de votre campagne (acheteurs, cuvées, prix, etc.) Nous nous occupons de la rédaction, du ciblage et de la délivrabilité technique.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold flex items-center justify-center mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Suivez vos opportunités  </h3>
              <p className="text-muted-foreground">
                Retrouvez les acheteurs intéressez par vos campagnes, ajoutez desnotes et gérez le suivi  directement dans votre CRM. Négociez et concluez vos commandes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - Single Card */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Combien ça coûte ?      
            </h2>
            <p className="text-xl text-muted-foreground">
              Votre accès complet à la plateforme et à tous ses services         
            </p>
          </div>

          <div className="max-w-lg mx-auto">
            <Card className="border-2 border-primary relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-sm font-medium px-4 py-1 rounded-bl-lg">
                Formule unique
              </div>
              <CardContent className="p-8">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-foreground mb-2">Essentiel</h3>
                  <p className="text-muted-foreground">Tout inclus, sans surprise</p>
                </div>
                <div className="mb-8">
                  <span className="text-5xl font-bold text-foreground">149€</span>
                  <span className="text-muted-foreground"> HT/mois</span>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-primary" />
                    <span className="text-foreground">Accès à la base de 20 000+ acheteurs</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-primary" />
                    <span className="text-foreground">1 campagne par mois créée et gérée par nos soins</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-foreground">Garantie de délivrabilité (Anti-Spam)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-foreground">CRM complet (Vue Kanban, Notes, Import de leads)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-foreground">Support dédié aux domaines viticoles</span>
                  </li>
                </ul>
                <Link to="/auth" className="block">
                  <Button className="w-full bg-primary hover:bg-primary/90" size="lg">
                    Demander une démo
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-primary">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-6">Rejoignez les 70+ domaines qui nous font confiance.</h2>
          <p className="text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
            Externalisez votre prospection export et concentrez-vous sur ce que vous faites de mieux : produire des vins d'exception.
          </p>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
              Demander une démo
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
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Grape className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Wine Exporters</h1>
                <p className="text-xs text-muted-foreground">by ExportVins </p>
              </div>
            </div>
            <p className="text-muted-foreground text-sm">© 2026 Export Vins. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>;
};
export default LandingPage;