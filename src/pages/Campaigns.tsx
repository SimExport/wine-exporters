import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Rocket, Plus, Eye, Trash2, Archive, MousePointer, Reply, Pencil } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { CampaignReportsSection } from '@/components/CampaignReportsSection';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/format';

interface Campaign {
  id: string;
  name: string;
  status: string;
  target_markets: string[];
  created_at: string;
  schedule_at: string | null;
  stats_opens: number | null;
  stats_clicks: number | null;
  stats_replies: number | null;
  prospect_count?: number;
}

const CAMPAIGN_STATUS_COLORS = {
  draft: 'secondary',
  pending_validation: 'yellow',
  approved: 'green',
  sending: 'blue',
  results: 'purple',
  failed: 'red'
} as const;

const Campaigns = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (user) fetchCampaigns();
  }, [user]);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase.from('campaigns').select('*').eq('user_id', user?.id)
        .not('status', 'in', '("archived","manual")')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const campaignsWithCounts = await Promise.all((data || []).map(async campaign => {
        const { count } = await supabase.from('campaign_interested_contacts').select('*', {
          count: 'exact',
          head: true
        }).eq('campaign_id', campaign.id);
        return { ...campaign, prospect_count: count || 0 };
      }));
      setCampaigns(campaignsWithCounts as any);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({ title: t('common.error'), description: t('campaigns.toasts.loadError'), variant: "destructive" });
    } finally {
      setListLoading(false);
    }
  };

  const deleteCampaign = async (campaignId: string, campaignName: string, status: string) => {
    if (status === 'sending') {
      toast({
        title: t('campaigns.toasts.cannotDeleteTitle'),
        description: t('campaigns.toasts.cannotDeleteDescription'),
        variant: "destructive"
      });
      return;
    }
    if (!confirm(t('campaigns.toasts.deleteConfirm', { name: campaignName }))) return;
    try {
      const { error } = await supabase.from('campaigns').delete().eq('id', campaignId).eq('user_id', user?.id);
      if (error) throw error;
      toast({
        title: t('campaigns.toasts.deletedTitle'),
        description: t('campaigns.toasts.deletedDescription', { name: campaignName })
      });
      fetchCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast({ title: t('common.error'), description: t('campaigns.toasts.deleteError'), variant: "destructive" });
    }
  };

  const archiveCampaign = async (campaignId: string, campaignName: string) => {
    if (!confirm(t('campaigns.toasts.archiveConfirm', { name: campaignName }))) return;
    try {
      const { error } = await supabase.from('campaigns').update({ status: 'archived' }).eq('id', campaignId).eq('user_id', user?.id);
      if (error) throw error;
      toast({
        title: t('campaigns.toasts.archivedTitle'),
        description: t('campaigns.toasts.archivedDescription', { name: campaignName })
      });
      fetchCampaigns();
    } catch (error) {
      console.error('Error archiving campaign:', error);
      toast({ title: t('common.error'), description: t('campaigns.toasts.archiveError'), variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const color = CAMPAIGN_STATUS_COLORS[status as keyof typeof CAMPAIGN_STATUS_COLORS] || 'secondary';
    return <Badge variant={color as any}>
        {t(`campaigns.status.${status}`, { defaultValue: status })}
      </Badge>;
  };

  if (listLoading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }

  const STATUS_FILTERS = [
    { key: 'all', label: t('campaigns.list.filters.all'), color: 'bg-muted text-muted-foreground' },
    { key: 'draft', label: t('campaigns.list.filters.draft'), color: 'bg-secondary text-secondary-foreground' },
    { key: 'pending_validation', label: t('campaigns.list.filters.pending_validation'), color: 'bg-yellow-100 text-yellow-800' },
    { key: 'active', label: t('campaigns.list.filters.active'), color: 'bg-green-100 text-green-800' },
    { key: 'results', label: t('campaigns.list.filters.results'), color: 'bg-purple-100 text-purple-800' },
  ];

  const filteredCampaigns = statusFilter === 'all'
    ? campaigns
    : campaigns.filter(c => c.status === statusFilter);

      return <div className="container mx-auto p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">{t('campaigns.list.title')}</h1>
              <p className="text-muted-foreground mt-1">
                {t('campaigns.list.subtitle')}
              </p>
            </div>
            <Button onClick={() => navigate('/create-campaign')}>
              <Plus className="h-4 w-4 mr-2" />
              {t('campaigns.list.newCampaign')}
            </Button>
          </div>
  
          <CampaignReportsSection />
  
          {campaigns.length === 0 ? <Card>
              <CardContent>
                <EmptyState
                  icon={<Rocket className="h-10 w-10" />}
                  title={t('campaigns.list.emptyTitle')}
                  description={t('campaigns.list.emptyDescription')}
                  action={{ label: t('campaigns.list.emptyAction'), href: "/create-campaign" }}
                />
              </CardContent>
            </Card> : <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle>{t('campaigns.list.yoursCount', { count: campaigns.length })}</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_FILTERS.map(f => {
                      const count = f.key === 'all' ? campaigns.length : campaigns.filter(c => c.status === f.key).length;
                      const isActive = statusFilter === f.key;
                      return (
                        <button
                          key={f.key}
                          onClick={() => setStatusFilter(f.key)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all border ${
                            isActive
                              ? 'border-primary ring-1 ring-primary shadow-sm ' + f.color
                              : 'border-border ' + f.color + ' opacity-70 hover:opacity-100'
                          }`}
                        >
                          {f.label}
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${isActive ? 'bg-background/60' : 'bg-background/40'}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredCampaigns.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">{t('campaigns.list.noneForStatus')}</p>
                ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('campaigns.list.table.name')}</TableHead>
                      <TableHead>{t('campaigns.list.table.status')}</TableHead>
                      <TableHead>{t('campaigns.list.table.markets')}</TableHead>
                      <TableHead>{t('campaigns.list.table.prospects')}</TableHead>
                      <TableHead>{t('campaigns.list.table.kpis')}</TableHead>
                      <TableHead>{t('campaigns.list.table.createdAt')}</TableHead>
                      <TableHead>{t('campaigns.list.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCampaigns.map(campaign => <TableRow
                        key={campaign.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          if (campaign.status === 'draft') {
                            navigate(`/create-campaign?id=${campaign.id}`);
                          } else {
                            navigate(`/campaigns/${campaign.id}`);
                          }
                        }}
                      >
                        <TableCell className="font-medium">
                          {campaign.name}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(campaign.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {campaign.target_markets.slice(0, 2).map(market => <Badge key={market} variant="outline" className="text-xs">
                                {market.slice(0, 3)}
                              </Badge>)}
                            {campaign.target_markets.length > 2 && <Badge variant="outline" className="text-xs">
                                +{campaign.target_markets.length - 2}
                              </Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {t('campaigns.list.table.prospectsCount', { count: campaign.prospect_count || 0 })}
                        </TableCell>
                        <TableCell>
                          {campaign.status === 'draft' ? (
                            <span className="text-muted-foreground text-sm">—</span>
                          ) : (
                            <div className="text-xs space-y-1 text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Eye className="h-3 w-3 shrink-0" />
                                <span>{t('campaigns.list.table.opens', { count: campaign.stats_opens ?? 0 })}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <MousePointer className="h-3 w-3 shrink-0" />
                                <span>{t('campaigns.list.table.clicks', { count: campaign.stats_clicks ?? 0 })}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Reply className="h-3 w-3 shrink-0" />
                                <span>{t('campaigns.list.table.replies', { count: campaign.stats_replies ?? 0 })}</span>
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {formatDate(campaign.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            {campaign.status === 'draft' ? (
                              <Button size="sm" onClick={() => navigate(`/create-campaign?id=${campaign.id}`)}>
                                <Pencil className="h-4 w-4 mr-1" />
                                {t('campaigns.list.table.resume', { defaultValue: 'Reprendre' })}
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
                                <Eye className="h-4 w-4 mr-1" />
                                {t('campaigns.list.table.viewProspects')}
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => archiveCampaign(campaign.id, campaign.name)}>
                              <Archive className="h-4 w-4 mr-1" />
                              {t('campaigns.list.table.archive')}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => deleteCampaign(campaign.id, campaign.name, campaign.status)} disabled={campaign.status === 'sending'} className={campaign.status === 'sending' ? 'opacity-50 cursor-not-allowed' : ''}>
                              <Trash2 className="h-4 w-4 mr-1" />
                              {t('campaigns.list.table.delete')}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>
                )}
              </CardContent>
            </Card>}
        </div>;
};
export default Campaigns;
