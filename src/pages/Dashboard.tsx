import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Grape, Settings, LogOut, CreditCard, Globe, Clock, CheckCircle } from 'lucide-react';

interface Profile {
  id: string;
  domain_name: string | null;
  subscription_plan: string;
  campaigns_remaining: number;
  location: string | null;
  aoc: string | null;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  target_markets: string[];
  created_at: string;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchCampaigns();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger votre profil",
          variant: "destructive",
        });
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching campaigns:', error);
      } else {
        setCampaigns(data || []);
      }
    } catch (error) {
      console.error('Unexpected error fetching campaigns:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Déconnexion réussie",
        description: "À bientôt sur ExportVins !",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la déconnexion",
        variant: "destructive",
      });
    }
  };

  const getSubscriptionBadge = (plan: string) => {
    switch (plan) {
      case 'monthly':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Abonnement Mensuel</Badge>;
      case 'pay_per_campaign':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Paiement à la Carte</Badge>;
      default:
        return <Badge variant="outline">Aucun Abonnement</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Grape className="h-12 w-12 text-purple-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Chargement de votre tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Grape className="h-8 w-8 text-purple-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                ExportVins
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {user?.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Tableau de Bord
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Bienvenue {profile?.domain_name || 'sur votre espace vigneron'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Plan d'abonnement */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Plan Actuel</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getSubscriptionBadge(profile?.subscription_plan || 'none')}
                <p className="text-xs text-muted-foreground">
                  {profile?.subscription_plan === 'monthly' 
                    ? 'Accès complet à la base de données'
                    : profile?.subscription_plan === 'pay_per_campaign'
                    ? 'Accès limité aux pays sélectionnés'
                    : 'Aucun accès premium'
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Campagnes restantes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Campagnes Disponibles</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {profile?.campaigns_remaining || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Campagnes de prospection restantes
              </p>
            </CardContent>
          </Card>

          {/* Domaine */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Votre Domaine</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {profile?.domain_name || 'Non renseigné'}
                </p>
                {profile?.location && (
                  <p className="text-xs text-muted-foreground">
                    {profile.location}
                  </p>
                )}
                {profile?.aoc && (
                  <Badge variant="outline" className="text-xs">
                    AOC {profile.aoc}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration du Domaine</CardTitle>
              <CardDescription>
                Renseignez les informations de votre domaine viticole
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link to="/profile">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurer mon domaine
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Renseignez vos informations viticoles
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lancer une Campagne</CardTitle>
              <CardDescription>
                Démarrez une campagne de prospection internationale
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                disabled={!profile?.campaigns_remaining}
                variant={profile?.campaigns_remaining ? "default" : "outline"}
                asChild={!!profile?.campaigns_remaining}
              >
                {profile?.campaigns_remaining ? (
                  <Link to="/campaigns">
                    <Globe className="h-4 w-4 mr-2" />
                    Nouvelle campagne
                  </Link>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-2" />
                    Aucune campagne disponible
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                {profile?.campaigns_remaining 
                  ? 'Sélectionnez vos marchés cibles'
                  : 'Souscrivez à un plan pour lancer des campagnes'
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Campagnes */}
        {campaigns.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Vos Campagnes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{campaign.name}</CardTitle>
                    <div className="flex items-center space-x-2">
                      {campaign.status === 'pending_validation' ? (
                        <>
                          <Clock className="h-4 w-4 text-orange-500" />
                          <Badge variant="outline" className="text-orange-600 border-orange-200">
                            En attente de validation
                          </Badge>
                        </>
                      ) : campaign.status === 'active' ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            Active
                          </Badge>
                        </>
                      ) : (
                        <Badge variant="outline">{campaign.status}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Marchés: {campaign.target_markets.slice(0, 3).join(', ')}
                        {campaign.target_markets.length > 3 && ` +${campaign.target_markets.length - 3}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Créée le {new Date(campaign.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;