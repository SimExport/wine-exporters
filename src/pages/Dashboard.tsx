import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Grape, Search, Send, Store, Kanban, ArrowRight, AlertCircle } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';

interface Profile {
  domain_name: string | null;
  contact_name: string | null;
  location: string | null;
  wine_colors: string[] | null;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  target_markets: string[];
}

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { searchCredits } = useCredits();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [pipelineCounts, setPipelineCounts] = useState({
    contacted: 0,
    samples: 0,
    followUps: 0,
    negotiation: 0,
    openOpportunities: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [profileRes, campaignsRes, leadsRes] = await Promise.all([
          supabase.from('profiles').select('domain_name,contact_name,location,wine_colors').eq('user_id', user.id).maybeSingle(),
          supabase.from('campaigns').select('id,name,status,target_markets').eq('user_id', user.id).eq('status', 'active').order('launched_at', { ascending: false }).limit(1),
          supabase.from('leads').select('prospect_status,campaign_id,campaigns!inner(user_id)').eq('campaigns.user_id', user.id),
        ]);
        setProfile(profileRes.data as Profile);
        setActiveCampaign((campaignsRes.data?.[0] as Campaign) ?? null);

        const leads = (leadsRes.data ?? []) as Array<{ prospect_status: string }>;
        const counts = { contacted: 0, samples: 0, followUps: 0, negotiation: 0, openOpportunities: 0 };
        for (const l of leads) {
          const s = l.prospect_status;
          if (s === 'new') counts.contacted++;
          else if (s === 'samples_requested' || s === 'samples_sent') counts.samples++;
          else if (s === 'received' || s === 'tasted') counts.followUps++;
          else if (s === 'negotiation') counts.negotiation++;
          if (s !== 'won' && s !== 'lost') counts.openOpportunities++;
        }
        setPipelineCounts(counts);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Grape className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">{t('dashboardPage.loading')}</p>
        </div>
      </div>
    );
  }

  const isProfileIncomplete =
    !profile?.domain_name ||
    !profile?.contact_name ||
    !profile?.location ||
    !profile?.wine_colors ||
    profile.wine_colors.length === 0;

  const firstName = profile?.contact_name?.split(' ')[0] ?? t('dashboardPage.welcomeFallback');

  const cards = [
    {
      key: 'search',
      icon: Search,
      title: t('dashboardPage.hub.search.title'),
      desc: t('dashboardPage.hub.search.desc'),
      badge: t('dashboardPage.hub.search.available', { count: searchCredits }),
      badgeVariant: 'info' as const,
      cta: t('dashboardPage.hub.search.cta'),
      to: '/importers',
    },
    {
      key: 'campaign',
      icon: Send,
      title: t('dashboardPage.hub.campaign.title'),
      desc: activeCampaign
        ? `${activeCampaign.name} — ${(activeCampaign.target_markets ?? []).join(', ')}`
        : t('dashboardPage.hub.campaign.emptyDesc'),
      badge: activeCampaign ? t('dashboardPage.hub.campaign.active') : t('dashboardPage.hub.campaign.none'),
      badgeVariant: activeCampaign ? ('success' as const) : ('muted' as const),
      cta: activeCampaign ? t('dashboardPage.hub.campaign.ctaView') : t('dashboardPage.hub.campaign.ctaCreate'),
      to: activeCampaign ? `/campaigns/${activeCampaign.id}` : '/create-campaign',
    },
    {
      key: 'importers',
      icon: Store,
      title: t('dashboardPage.hub.importers.title'),
      desc: t('dashboardPage.hub.importers.desc'),
      badge: t('dashboardPage.hub.importers.badge'),
      badgeVariant: 'muted' as const,
      cta: t('dashboardPage.hub.importers.cta'),
      to: '/importers',
    },
    {
      key: 'pipeline',
      icon: Kanban,
      title: t('dashboardPage.hub.pipeline.title'),
      desc: t('dashboardPage.hub.pipeline.desc'),
      badge: t('dashboardPage.hub.pipeline.opportunities', { count: pipelineCounts.openOpportunities }),
      badgeVariant: 'muted' as const,
      cta: t('dashboardPage.hub.pipeline.cta'),
      to: '/pipeline',
    },
  ];

  const badgeClass = (v: 'success' | 'info' | 'muted') =>
    v === 'success'
      ? 'bg-green-100 text-green-800 border-green-200'
      : v === 'info'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'bg-muted text-muted-foreground border-transparent';

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Greeting */}
        <h1 className="text-3xl font-bold text-foreground mb-6">
          {t('dashboardPage.hub.hello')}, <span className="text-primary">{firstName}</span>
        </h1>

        {/* Profile incomplete banner */}
        {isProfileIncomplete && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-border bg-secondary/40 p-5">
            <div className="flex items-start gap-3 flex-1">
              <div className="bg-background rounded-lg p-2.5 border">
                <AlertCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{t('dashboardPage.hub.profileIncompleteTitle')}</p>
                <p className="text-sm text-muted-foreground">{t('dashboardPage.hub.profileIncompleteDesc')}</p>
              </div>
            </div>
            <Button asChild variant="outline" className="bg-background">
              <Link to="/profile">{t('dashboardPage.hub.completeProfile')}</Link>
            </Button>
          </div>
        )}

        {/* 2x2 action cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.key} className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-secondary/60 rounded-lg p-2.5">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge className={`${badgeClass(c.badgeVariant)} hover:${badgeClass(c.badgeVariant)} font-medium`} variant="outline">
                    {c.badge}
                  </Badge>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{c.title}</h3>
                <p className="text-sm text-muted-foreground mb-4 flex-1">{c.desc}</p>
                <Link to={c.to} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2 transition-all">
                  <ArrowRight className="h-4 w-4" />
                  {c.cta}
                </Link>
              </div>
            );
          })}
        </div>

        {/* Pipeline strip */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">{t('dashboardPage.hub.pipelineStrip.title')}</h3>
            <Link to="/pipeline" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              {t('dashboardPage.hub.pipelineStrip.viewAll')} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: t('dashboardPage.hub.pipelineStrip.contacted'), sub: t('dashboardPage.hub.pipelineStrip.contactedSub'), value: pipelineCounts.contacted },
              { label: t('dashboardPage.hub.pipelineStrip.samples'), sub: t('dashboardPage.hub.pipelineStrip.samplesSub'), value: pipelineCounts.samples },
              { label: t('dashboardPage.hub.pipelineStrip.followUps'), sub: t('dashboardPage.hub.pipelineStrip.followUpsSub'), value: pipelineCounts.followUps },
              { label: t('dashboardPage.hub.pipelineStrip.negotiation'), sub: t('dashboardPage.hub.pipelineStrip.negotiationSub'), value: pipelineCounts.negotiation },
            ].map((col) => (
              <div key={col.label} className="rounded-lg bg-secondary/40 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{col.label}</p>
                <p className="text-3xl font-bold text-foreground leading-none">{col.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{col.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
