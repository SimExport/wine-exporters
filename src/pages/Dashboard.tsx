import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Grape, Search, Send, Store, Kanban, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import { GettingStartedCard } from '@/components/dashboard/GettingStartedCard';
import { EnrichmentActivityCard } from '@/components/importers/EnrichmentActivityCard';
import { pickCampaignCard, isSubmittedCampaign, summarizePipeline, countActiveOpportunities, isProfileComplete, type DashboardCampaign, type PipelineSummary } from '@/lib/dashboard-summary';

interface Profile {
  domain_name: string | null;
  contact_name: string | null;
  location: string | null;
  priority_markets: string | null;
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
  const { searchCredits, campaignCredits } = useCredits();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [campaignCard, setCampaignCard] = useState<ReturnType<typeof pickCampaignCard>>({ state: 'none', campaign: null });
  const [pipeline, setPipeline] = useState<PipelineSummary>({ newProspects: 0, samples: 0, negotiation: 0, won: 0, open: 0 });
  const [opportunitiesCount, setOpportunitiesCount] = useState(0);
  const [errors, setErrors] = useState({ campaigns: false, pipeline: false, opportunities: false });
  const [steps, setSteps] = useState<Record<'opportunities' | 'search' | 'campaign' | 'crm', boolean | null>>({ opportunities: false, search: false, campaign: false, crm: false });
  const [profileError, setProfileError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [profileRes, allCampaignsRes, importerCountRes, tendersRes, viewsRes, searchRes] = await Promise.all([
          supabase.from('profiles').select('domain_name,contact_name,location,priority_markets').eq('user_id', user.id).maybeSingle(),
          supabase.from('campaigns').select('id,name,status,target_markets,launched_at,created_at,validation_requested_at').eq('user_id', user.id),
          supabase.from('importer_requests').select('id', { count: 'exact', head: true }).eq('status', 'published'),
          supabase.from('tender_requests').select('deadline_answer').eq('status', 'published'),
          supabase.from('opportunity_views').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('sourcing_requests').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        ]);
        setProfile(profileRes.data as Profile);
        setProfileError(!!profileRes.error);
        const oppError = !!(importerCountRes.error || tendersRes.error);
        setOpportunitiesCount(oppError ? 0 : countActiveOpportunities(importerCountRes.count ?? 0, (tendersRes.data ?? []).map(t => t.deadline_answer)));

        const allCampaigns = (allCampaignsRes.data ?? []) as DashboardCampaign[];
        setCampaignCard(pickCampaignCard(allCampaigns));

        const campaignIds = allCampaigns.map(c => c.id);
        let statuses: Array<string | null> = [];
        let leadsError = !!allCampaignsRes.error;
        if (campaignIds.length > 0) {
          const { data, error } = await supabase.from('leads').select('prospect_status').in('campaign_id', campaignIds);
          if (error) leadsError = true;
          statuses = (data ?? []).map(l => l.prospect_status as string | null);
        }
        setPipeline(summarizePipeline(statuses));
        setErrors({ campaigns: !!allCampaignsRes.error, pipeline: leadsError, opportunities: oppError });
        setSteps({
          opportunities: viewsRes.error ? null : (viewsRes.count ?? 0) > 0,
          search: searchRes.error ? null : (searchRes.count ?? 0) > 0,
          campaign: allCampaignsRes.error ? null : allCampaigns.some(isSubmittedCampaign),
          crm: leadsError ? null : statuses.length > 0,
        });
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

  const isProfileIncomplete = !profileError && !isProfileComplete(profile);
  const { state: campaignState, campaign: shownCampaign } = campaignCard;
  const unavailable = t('dashboardPage.hub.unavailable');

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
      to: '/recherches',
    },
    {
      key: 'campaign',
      icon: Send,
      title: t('dashboardPage.hub.campaign.title'),
      desc: errors.campaigns
        ? t('dashboardPage.hub.loadError')
        : shownCampaign
        ? `${shownCampaign.name}${(shownCampaign.target_markets ?? []).length ? ` — ${(shownCampaign.target_markets ?? []).join(', ')}` : ''}. ${t(`dashboardPage.hub.campaign.hints.${campaignState}`)}`
        : t('dashboardPage.hub.campaign.emptyDesc'),
      badge: errors.campaigns
        ? unavailable
        : shownCampaign
        ? t(`dashboardPage.hub.campaign.states.${campaignState}`)
        : campaignCredits > 0
          ? t('dashboardPage.hub.search.available', { count: campaignCredits })
          : t('dashboardPage.hub.campaign.none'),
      badgeVariant: shownCampaign ? ('success' as const) : campaignCredits > 0 ? ('info' as const) : ('muted' as const),
      cta: !shownCampaign ? t('dashboardPage.hub.campaign.ctaCreate') : campaignState === 'results' ? t('dashboardPage.hub.campaign.ctaResults') : t('dashboardPage.hub.campaign.ctaView'),
      to: shownCampaign ? `/campaigns/${shownCampaign.id}` : errors.campaigns ? '/campaigns' : '/create-campaign',
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
      badge: errors.pipeline ? unavailable : t('dashboardPage.hub.pipeline.opportunities', { count: pipeline.open }),
      badgeVariant: 'muted' as const,
      cta: t('dashboardPage.hub.pipeline.cta'),
      to: '/pipeline',
    },
  ];

  const badgeClass = (v: 'success' | 'info' | 'muted') =>
    v === 'success'
      ? 'bg-primary text-primary-foreground border-transparent'
      : v === 'info'
      ? 'bg-secondary text-primary border-border'
      : 'bg-muted text-muted-foreground border-transparent';

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Greeting */}
        <h1 className="text-3xl font-bold text-foreground mb-6">
          {t('dashboardPage.hub.hello')}, <span className="text-primary">{firstName}</span> 👋
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

        <GettingStartedCard done={{ profile: profileError ? null : !isProfileIncomplete, ...steps }} />

        <EnrichmentActivityCard />

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
        <div className="rounded-xl border border-border bg-card p-5 mb-8 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-secondary/60 rounded-lg p-2.5">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <Badge className="bg-secondary text-primary border-border hover:bg-secondary font-medium" variant="outline">
              {errors.opportunities ? unavailable : t('dashboardPage.hub.opportunities.available', { count: opportunitiesCount })}
            </Badge>
          </div>
          <h3 className="font-semibold text-foreground mb-1">{t('dashboardPage.hub.opportunities.title')}</h3>
          <p className="text-sm text-muted-foreground mb-4">{t('dashboardPage.hub.opportunities.desc')}</p>
          <Link to="/opportunites" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2 transition-all">
            <ArrowRight className="h-4 w-4" />
            {t('dashboardPage.hub.opportunities.cta')}
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">{t('dashboardPage.hub.pipelineStrip.title')}</h3>
            <Link to="/pipeline" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              {t('dashboardPage.hub.pipelineStrip.viewAll')} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: t('dashboardPage.hub.pipelineStrip.newProspects'), sub: t('dashboardPage.hub.pipelineStrip.newProspectsSub'), value: pipeline.newProspects },
              { label: t('dashboardPage.hub.pipelineStrip.samples'), sub: t('dashboardPage.hub.pipelineStrip.samplesSub'), value: pipeline.samples },
              { label: t('dashboardPage.hub.pipelineStrip.negotiation'), sub: t('dashboardPage.hub.pipelineStrip.negotiationSub'), value: pipeline.negotiation },
              { label: t('dashboardPage.hub.pipelineStrip.won'), sub: t('dashboardPage.hub.pipelineStrip.wonSub'), value: pipeline.won },
            ].map((col) => (
              <div key={col.label} className="rounded-lg bg-secondary/40 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{col.label}</p>
                <p className="text-3xl font-bold text-foreground leading-none">{errors.pipeline ? '—' : col.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{col.sub}</p>
              </div>
            ))}
          </div>
          {errors.pipeline && <p className="mt-3 text-sm text-destructive">{t('dashboardPage.hub.loadError')}</p>}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
