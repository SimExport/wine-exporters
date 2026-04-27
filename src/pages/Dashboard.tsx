import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Grape, Settings, LogOut, CreditCard, Globe, Clock, CheckCircle, AlertCircle, Plus, Crown, Megaphone, Users, MapPin, TrendingUp, Rocket, Zap, MessageSquare, UserCheck, Activity } from 'lucide-react';
import { LeadsWorldMap } from '@/components/LeadsWorldMap';
import { useTranslation } from 'react-i18next';
import { formatDate, formatNumber, formatRelative } from '@/lib/format';

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
  const { t } = useTranslation();
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
          toast({ title: t('common.error'), description: t('dashboard.loadProfileError'), variant: "destructive" });
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
            const campName = camp?.name ?? t('dashboard.campaign');
            if (ev.type === 'launched') {
              activityItems.push({ id: `ev-${ev.id}`, type: 'campaign_launched', label: t('dashboard.campaignLaunched'), sublabel: campName, date: ev.created_at, icon: Zap, iconColor: 'text-primary' });
            } else if (ev.type === 'reply') {
              activityItems.push({ id: `ev-${ev.id}`, type: 'reply_received', label: t('dashboard.replyReceived'), sublabel: campName, date: ev.created_at, icon: MessageSquare, iconColor: 'text-green-600' });
            }
          });

          // Campaign creations
          fetchedCampaigns.slice(0, 5).forEach(c => {
            activityItems.push({ id: `camp-${c.id}`, type: 'campaign_created', label: t('dashboard.newCampaign'), sublabel: c.name, date: c.created_at, icon: Megaphone, iconColor: 'text-blue-600' });
          });

          // Prospect updates
          (leadsResult.data || []).forEach(lead => {
            const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.company_name || t('dashboard.prospect');
            activityItems.push({ id: `lead-${lead.id}`, type: 'prospect_updated', label: t('dashboard.prospectUpdated'), sublabel: name, date: lead.updated_at, icon: UserCheck, iconColor: 'text-orange-500' });
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
      toast({ title: t('sidebar.signOutSuccess'), description: t('auth.welcome') });
    } catch (error) {
      toast({ title: t('common.error'), description: t('sidebar.signOutError'), variant: "destructive" });
    }
  };

  const getSubscriptionBadge = (plan: string) => {
    switch (plan) {
      case 'monthly':
        return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">{t('dashboardPage.plan.monthly')}</Badge>;
      case 'pay_per_campaign':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">{t('dashboardPage.plan.payPerCampaign')}</Badge>;
      default:
        return <Badge variant="outline" className="bg-muted/50">{t('dashboardPage.plan.none')}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_validation':
        return <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-orange-500" />
          <Badge className="bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-50">{t('dashboardPage.campaignStatus.pendingValidation')}</Badge>
        </div>;
      case 'active':
        return <div className="flex items-center space-x-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">{t('dashboardPage.campaignStatus.active')}</Badge>
        </div>;
      case 'completed':
        return <div className="flex items-center space-x-2">
          <CheckCircle className="h-4 w-4 text-gray-500" />
          <Badge variant="outline" className="text-muted-foreground">{t('dashboardPage.campaignStatus.completed')}</Badge>
        </div>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Grape className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
        <p className="text-muted-foreground">{t('dashboardPage.loading')}</p>
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
    { label: t('dashboardPage.stats.campaignsSent'), value: formatNumber(launchedCampaigns), icon: Megaphone },
    { label: t('dashboardPage.stats.importersFound'), value: formatNumber(totalReplies), icon: Users },
    { label: t('dashboardPage.stats.marketsProspected'), value: formatNumber(uniqueMarkets), icon: MapPin },
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
                {t('dashboardPage.signOut')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-1">{t('dashboardPage.title')}</h2>
          <p className="text-muted-foreground">
            {t('dashboardPage.welcome')}{profile?.contact_name ? `, ${profile.contact_name}` : ` ${t('dashboardPage.welcomeFallback')}`} 👋
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
              <CardTitle className="text-sm font-medium">{t('dashboardPage.plan.title')}</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getSubscriptionBadge(profile?.subscription_plan || 'none')}
                <p className="text-xs text-muted-foreground">
                  {profile?.subscription_plan === 'monthly'
                    ? t('dashboardPage.plan.monthlyDesc')
                    : profile?.subscription_plan === 'pay_per_campaign'
                    ? t('dashboardPage.plan.payPerCampaignDesc')
                    : t('dashboardPage.plan.noneDesc')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Campagnes restantes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboardPage.remaining.title')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{profile?.campaigns_remaining || 0}</div>
              <p className="text-xs text-muted-foreground">{t('dashboardPage.remaining.subtitle')}</p>
            </CardContent>
          </Card>

          {/* Domaine */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboardPage.domain.title')}</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {isProfileIncomplete
                  ? <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium text-orange-600">{t('dashboardPage.domain.incomplete')}</span>
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
              <CardTitle>{t('dashboardPage.config.title')}</CardTitle>
              <CardDescription>{t('dashboardPage.config.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link to="/profile">
                  <Settings className="h-4 w-4 mr-2" />
                  {t('dashboardPage.config.cta')}
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground mt-2">{t('dashboardPage.config.hint')}</p>
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
                <CardTitle>{t('dashboardPage.upgradeCard.title')}</CardTitle>
                <CardDescription>{t('dashboardPage.upgradeCard.description')}</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <Button className="w-full" asChild>
                  <Link to="/billing">
                    <Rocket className="h-4 w-4 mr-2" />
                    {t('dashboardPage.upgradeCard.cta')}
                  </Link>
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {t('dashboardPage.upgradeCard.fineprint')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card
              className={`${hasNoCampaignsRemaining ? 'opacity-90' : 'cursor-pointer hover:shadow-md'} transition-shadow`}
              onClick={() => !hasNoCampaignsRemaining && navigate('/create-campaign')}
            >
              <CardHeader>
                <CardTitle>{t('dashboardPage.campaignCard.title')}</CardTitle>
                <CardDescription>{t('dashboardPage.campaignCard.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                {hasNoCampaignsRemaining ? (
                  <>
                    <Button className="w-full" variant="outline" asChild>
                      <Link to="/billing">
                        <CreditCard className="h-4 w-4 mr-2" />
                        {t('dashboardPage.campaignCard.subscribe')}
                      </Link>
                    </Button>
                    <p className="text-xs text-orange-600 mt-2">{t('dashboardPage.campaignCard.subscribeHint')}</p>
                  </>
                ) : (
                  <>
                    <Button className="w-full" asChild>
                      <Link to="/create-campaign">
                        <Globe className="h-4 w-4 mr-2" />
                        {t('dashboardPage.campaignCard.newCampaign')}
                      </Link>
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">{t('dashboardPage.campaignCard.newCampaignHint')}</p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Campaigns list */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">{t('dashboardPage.campaignsList.title')}</h3>

          {campaigns.length === 0 ? (
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="text-lg font-medium text-foreground mb-2">{t('dashboardPage.campaignsList.emptyTitle')}</h4>
              <p className="text-sm text-muted-foreground mb-4">
                {t('dashboardPage.campaignsList.emptyDescription')}
              </p>
              {!hasNoCampaignsRemaining && (
                <Button asChild>
                  <Link to="/create-campaign">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('dashboardPage.campaignsList.createFirst')}
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
                        {t('dashboardPage.campaignsList.marketsLabel')}: {campaign.target_markets.slice(0, 3).join(', ')}
                        {campaign.target_markets.length > 3 && ` +${campaign.target_markets.length - 3}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('dashboardPage.campaignsList.createdOn')} {formatDate(campaign.created_at)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* World Map */}
        {campaigns.length > 0 && (
          <div className="mt-8">
            <LeadsWorldMap campaignIds={campaigns.map(c => c.id)} />
          </div>
        )}

        {/* Activity Feed */}
        <div className="mt-8">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-3">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">{t('dashboardPage.activity.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Activity className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">{t('dashboardPage.activity.empty')}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">{t('dashboardPage.activity.emptyHint')}</p>
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
                          {formatRelative(item.date)}
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
