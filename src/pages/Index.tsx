import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Grape, Users, Globe, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Grape className="h-8 w-8 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              ExportVins
            </h1>
          </div>
          <Link to="/auth">
            <Button variant="outline">
              Se connecter
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Exportez vos vins vers le monde entier
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Plateforme de prospection internationale dédiée aux vignerons. 
            Trouvez des importateurs qualifiés et développez vos marchés d'export.
          </p>
          <Link to="/auth">
            <Button size="lg" className="mr-4">
              Commencer maintenant
            </Button>
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center">
            <CardHeader>
              <Users className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>Base d'importateurs</CardTitle>
              <CardDescription>
                Accédez à notre réseau d'importateurs qualifiés dans le monde entier
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Globe className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>Marchés internationaux</CardTitle>
              <CardDescription>
                Fiches détaillées des marchés et opportunités par pays
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <TrendingUp className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>Campagnes ciblées</CardTitle>
              <CardDescription>
                Lancez des campagnes de prospection personnalisées et qualifiées
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Pricing Preview */}
        <div className="text-center">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Nos offres
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Abonnement mensuel</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-purple-600">90€</span> HT/mois
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-left space-y-2 text-gray-600 dark:text-gray-300">
                  <li>• 1 campagne par mois incluse</li>
                  <li>• Accès complet à la base de données</li>
                  <li>• Fiches marchés téléchargeables</li>
                  <li>• Support prioritaire</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Paiement à la carte</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-purple-600">150-180€</span> par campagne
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-left space-y-2 text-gray-600 dark:text-gray-300">
                  <li>• Packs de 1 à 5 campagnes</li>
                  <li>• Prix dégressif selon volume</li>
                  <li>• Accès aux fiches des pays sélectionnés</li>
                  <li>• Flexibilité maximale</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
