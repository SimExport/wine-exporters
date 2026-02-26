import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Grape, Settings, LogOut, CreditCard, Globe, Clock, CheckCircle, AlertCircle, Plus, Crown, Megaphone, Users, MapPin, TrendingUp, Rocket, Zap, MessageSquare, UserCheck, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Profile {
  id: string;
  domain_name: string | null;
  subscription_plan: string;
  campaigns_remaining: number;
  location: string | null;
  aoc: string | null;
  contact_name: string | null;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  target_markets: string[];
  created_at: string;
  stats_opens: number | null;
  stats_replies: number | null;
  stats_bounces: number | null;
}

interface ActivityItem {
  id: string;
  type: 'campaign_launched' | 'reply_received' | 'prospect_updated' | 'campaign_created';
  label: string;
  sublabel?: string;
  date: string;
  icon: React.ElementType;
  iconColor: string;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const loadDashboardData = async () => {
      try {
        const [profileResult, campaignsResult] = await Promise.all([
          supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
          supabase.from('campaigns').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        ]);
        if (profileResult.error) {
          console.error('Error fetching profile:', profileResult.error);
          toast({ title: "Erreur", description: "Impossible de charger votre profil", variant: "destructive" });
        } else {
          setProfile(profileResult.data);
        }
        const fetchedCampaigns = campaignsResult.data || [];
        if (!campaignsResult.error) {
          setCampaigns(fetchedCampaigns);
        }

        // Build activity feed
        const activityItems: ActivityItem[] = [];

        // Campaign events (launched, completed, etc.)
        if (fetchedCampaigns.length > 0) {
          const campaignIds = fetchedCampaigns.map(c => c.id);
          const [eventsResult, leadsResult] = await Promise.all([
            supabase.from('campaign_events').select('*').in('campaign_id', campaignIds).order('created_at', { ascending: false }).limit(20),
            supabase.from('leads').select('id,first_name,last_name,company_name,updated_at,created_at,campaign_id,prospect_status').in('campaign_id', campaignIds).order('updated_at', { ascending: false }).limit(20),
          ]);

          // Map campaign events
          (eventsResult.data || []).forEach(ev => {
            const camp = fetchedCampaigns.find(c => c.id === ev.campaign_id);
            const campName = camp?.name ?? 'Campagne';
            if (ev.type === 'launched') {
              activityItems.push({ id: `ev-${ev.id}`, type: 'campaign_launched', label: `Campagne lancée`, sublabel: campName, date: ev.created_at, icon: Zap, iconColor: 'text-primary' });
            } else if (ev.type === 'reply') {
              activityItems.push({ id: `ev-${ev.id}`, type: 'reply_received', label: `Réponse reçue`, sublabel: campName, date: ev.created_at, icon: MessageSquare, iconColor: 'text-green-600' });
            }
          });

          // Campaign creations
          fetchedCampaigns.slice(0, 5).forEach(c => {
            activityItems.push({ id: `camp-${c.id}`, type: 'campaign_created', label: `Nouvelle campagne`, sublabel: c.name, date: c.created_at, icon: Megaphone, iconColor: 'text-blue-600' });
          });

          // Prospect updates
          (leadsResult.data || []).forEach(lead => {
            const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.company_name || 'Prospect';
            activityItems.push({ id: `lead-${lead.id}`, type: 'prospect_updated', label: `Prospect mis à jour`, sublabel: name, date: lead.updated_at, icon: UserCheck, iconColor: 'text-orange-500' });
          });
        }

        // Sort by date desc, keep top 8
        activityItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setActivity(activityItems.slice(0, 8));
      } catch (error) {
        console.error('Unexpected error:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, [user, toast]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({ title: "Déconnexion réussie", description: "À bientôt sur ExportVins !" });
    } catch (error) {
      toast({ title: "Erreur", description: "Erreur lors de la déconnexion", variant: "destructive" });
    }
  };

  const getSubscriptionBadge = (plan: string) => {
    switch (plan) {
      case 'monthly':
        return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">Abonnement Mensuel</Badge>;
      case 'pay_per_campaign':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">Paiement à la Carte</Badge>;
      default:
        return <Badge variant="outline" className="bg-muted/50">Aucun Abonnement</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_validation':
        return <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-orange-500" />
          <Badge className="bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-50">En attente de validation</Badge>
        </div>;
      case 'active':
        return <div className="flex items-center space-x-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">Active</Badge>
        </div>;
      case 'completed':
        return <div className="flex items-center space-x-2">
          <CheckCircle className="h-4 w-4 text-gray-500" />
          <Badge variant="outline" className="text-muted-foreground">Terminée</Badge>
        </div>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Grape className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
        <p className="text-muted-foreground">Chargement de votre tableau de bord...</p>
      </div>
    </div>;
  }

  const hasNoCampaignsRemaining = !profile?.campaigns_remaining || profile.campaigns_remaining === 0;
  const isProfileIncomplete = !profile?.domain_name;
  const isFreeUser = !profile?.subscription_plan || profile.subscription_plan === 'none';

  // Aggregate stats from all campaigns
  const launchedCampaigns = campaigns.filter(c => c.status !== 'draft' && c.status !== 'pending_validation').length;
  const totalReplies = campaigns.reduce((sum, c) => sum + (c.stats_replies || 0), 0);
  const uniqueMarkets = new Set(campaigns.flatMap(c => c.target_markets || [])).size;

  const globalStats = [
    { label: 'Campagnes envoyées', value: launchedCampaigns.toLocaleString('fr-FR'), icon: Megaphone },
    { label: 'Importateurs trouvés', value: totalReplies.toLocaleString('fr-FR'), icon: Users },
    { label: 'Marchés prospectés', value: uniqueMarkets.toString(), icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Grape className="h-8 w-8 mr-3 text-primary" />
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">{user?.email}</span>
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
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-1">Tableau de Bord</h2>
          <p className="text-muted-foreground">
            Bienvenue{profile?.contact_name ? `, ${profile.contact_name}` : ' Vigneron'} 👋
          </p>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {globalStats.map(stat => (
            <div key={stat.label} className="bg-card border rounded-xl p-4 flex items-center gap-4">
              <div className="bg-secondary rounded-lg p-2.5">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Plan */}
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
                    : 'Aucun accès premium'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Campagnes restantes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Campagnes Disponibles</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{profile?.campaigns_remaining || 0}</div>
              <p className="text-xs text-muted-foreground">Campagnes de prospection restantes</p>
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
                {isProfileIncomplete
                  ? <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium text-orange-600">Profil incomplet</span>
                    </div>
                  : <p className="text-sm font-medium">{profile.domain_name}</p>}
                {profile?.location && <p className="text-xs text-muted-foreground">{profile.location}</p>}
                {profile?.aoc && <Badge variant="outline" className="text-xs">AOC {profile.aoc}</Badge>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile config */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/profile')}>
            <CardHeader>
              <CardTitle>Configuration du Profil</CardTitle>
              <CardDescription>Renseignez les informations concernant votre domaine</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link to="/profile">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurer mon profil
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground mt-2">Renseignez vos informations en cliquant sur configurer mon profil</p>
            </CardContent>
          </Card>

          {/* Campaign / Upgrade card */}
          {isFreeUser ? (
            <Card className="border-primary/30 bg-primary/5 cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden" onClick={() => navigate('/billing')}>
              {/* Decorative gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
              <CardHeader className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100 text-xs">Premium</Badge>
                </div>
                <CardTitle>Démarrez votre prospection</CardTitle>
                <CardDescription>Accédez à 15 000+ acheteurs qualifiés dans le monde</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <Button className="w-full" asChild>
                  <Link to="/billing">
                    <Rocket className="h-4 w-4 mr-2" />
                    Passer Premium
                  </Link>
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  À partir de 199 €/mois · 3 mois d'engagement
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card
              className={`${hasNoCampaignsRemaining ? 'opacity-90' : 'cursor-pointer hover:shadow-md'} transition-shadow`}
              onClick={() => !hasNoCampaignsRemaining && navigate('/create-campaign')}
            >
              <CardHeader>
                <CardTitle>Lancer une Campagne</CardTitle>
                <CardDescription>Démarrez une campagne de prospection</CardDescription>
              </CardHeader>
              <CardContent>
                {hasNoCampaignsRemaining ? (
                  <>
                    <Button className="w-full" variant="outline" asChild>
                      <Link to="/billing">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Souscrire un abonnement
                      </Link>
                    </Button>
                    <p className="text-xs text-orange-600 mt-2">Souscrivez à un plan pour lancer des campagnes</p>
                  </>
                ) : (
                  <>
                    <Button className="w-full" asChild>
                      <Link to="/create-campaign">
                        <Globe className="h-4 w-4 mr-2" />
                        Nouvelle campagne
                      </Link>
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">Sélectionnez vos marchés cibles</p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Campaigns list */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Vos Campagnes</h3>

          {campaigns.length === 0 ? (
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="text-lg font-medium text-foreground mb-2">Aucune campagne pour le moment</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Créez votre première campagne de prospection pour toucher des importateurs à l'international.
              </p>
              {!hasNoCampaignsRemaining && (
                <Button asChild>
                  <Link to="/create-campaign">
                    <Plus className="h-4 w-4 mr-2" />
                    Créer ma première campagne
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{campaign.name}</CardTitle>
                    {getStatusBadge(campaign.status)}
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
          )}
        </div>

        {/* Activity Feed */}
        <div className="mt-8">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-3">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Dernière activité</CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Activity className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune activité récente</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Lancez votre première campagne pour voir l'activité ici</p>
                </div>
              ) : (
                <ol className="relative border-l border-border ml-3 space-y-0">
                  {activity.map((item, i) => (
                    <li key={item.id} className={`ml-4 ${i < activity.length - 1 ? 'pb-5' : ''}`}>
                      {/* Dot */}
                      <span className="absolute -left-1.5 flex items-center justify-center w-3 h-3 rounded-full bg-background border-2 border-border mt-1" />
                      <div className="flex items-start gap-2.5">
                        <div className={`shrink-0 mt-0.5 ${item.iconColor}`}>
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground leading-tight">{item.label}</p>
                          {item.sublabel && <p className="text-xs text-muted-foreground truncate">{item.sublabel}</p>}
                        </div>
                        <time className="text-xs text-muted-foreground/70 shrink-0 mt-0.5">
                          {formatDistanceToNow(new Date(item.date), { addSuffix: true, locale: fr })}
                        </time>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
