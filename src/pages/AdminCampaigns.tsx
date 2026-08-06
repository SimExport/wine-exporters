import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Eye, Plus, RotateCcw, ExternalLink, CheckCircle, X, Clock, Copy, SearchX, MapPin, Loader2, Mail, BarChart3, ClipboardList } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { ParseAddressesButton } from '@/components/ParseAddressesButton';
import { AdminCampaignReportUpload } from '@/components/admin/AdminCampaignReportUpload';
import { CampaignInterestedContactsUpload } from '@/components/admin/CampaignInterestedContactsUpload';
import { CampaignStatsPopover } from '@/components/admin/CampaignStatsPopover';
import { BrevoSyncButton } from '@/components/admin/BrevoSyncButton';
import { CampaignQualifiedProspectsSheet } from '@/components/admin/CampaignQualifiedProspectsSheet';
import { CampaignCompletionEmailPreview } from '@/components/admin/CampaignCompletionEmailPreview';
import { formatDate, formatDateTime } from '@/lib/format';

interface Campaign {
  id: string;
  name: string;
  status: string;
  target_markets: string[] | null;
  schedule_at: string | null;
  user_id: string;
  created_at: string;
  stats_opens: number | null;
  stats_clicks: number | null;
  stats_replies: number | null;
  brevo_campaign_id?: number | null;
  prospect_count?: number;
  user_settings?: {
    display_name: string | null;
  } | null;
}

interface InterestResponse {
  id: string;
  campaign_id: string;
  contact_name: string | null;
  email: string | null;
  company_name: string | null;
  country: string | null;
  phone: string | null;
  description: string | null;
  recommended_actions: string | null;
  created_at: string;
}

interface Wine {
  id: string;
  name: string;
  color: string;
  vintages: number[];
}

const CAMPAIGN_STATUS_COLORS = {
  draft: 'secondary',
  pending_validation: 'yellow',
  active: 'green',
  approved: 'green',
  sending: 'blue',
  results: 'purple',
  failed: 'red'
} as const;

const REQUESTED_ACTIONS_VALUES = ['price_list', 'samples', 'video_call', 'tech_sheets', 'other'] as const;

const COUNTRIES = [
  'FR', 'BE', 'CH', 'DE', 'UK', 'US', 'CA', 'AU', 'NZ', 'JP', 'SG', 'HK'
];

export default function AdminCampaigns() {
  const { t } = useTranslation();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [completionPreview, setCompletionPreview] = useState<{ id: string; name: string } | null>(null);
  const [wines, setWines] = useState<Wine[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [responsesByCampaign, setResponsesByCampaign] = useState<Record<string, InterestResponse[]>>({});
  const [responsesSheetCampaign, setResponsesSheetCampaign] = useState<Campaign | null>(null);
  const [qualifiedSheetCampaign, setQualifiedSheetCampaign] = useState<Campaign | null>(null);
  const { toast } = useToast();

  // Filters
  const [filters, setFilters] = useState({
    status: ['pending_validation'],
    winery: '',
    period: '30',
    market: 'all',
    search: ''
  });

  // Prospect form
  const [prospectForm, setProspectForm] = useState({
    campaign_id: '',
    first_name: '',
    last_name: '',
    company_name: '',
    email: '',
    phone: '',
    website_url: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postal_code: '',
    country: 'FR',
    requested_actions: [] as string[],
    requested_other: '',
    tally_response_url: ''
  });

  const [sampleItems, setSampleItems] = useState<Array<{
    wine_id: string;
    quantity: number;
    comment: string;
  }>>([]);

  useEffect(() => {
    fetchCampaigns();
    fetchEmailLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [campaigns, filters]);

  const fetchEmailLogs = async () => {
    try {
      setLogsLoading(true);
      const { data, error } = await supabase
        .from('campaign_email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      const logs = data || [];
      const campaignIds = Array.from(new Set(logs.map((l: any) => l.campaign_id).filter(Boolean)));
      let nameMap: Record<string, string> = {};
      if (campaignIds.length) {
        const { data: camps } = await supabase
          .from('campaigns')
          .select('id, name')
          .in('id', campaignIds);
        nameMap = Object.fromEntries((camps || []).map((c: any) => [c.id, c.name]));
      }
      setEmailLogs(logs.map((l: any) => ({ ...l, campaign_name: nameMap[l.campaign_id] || '—' })));
    } catch (e) {
      console.error('Error fetching email logs:', e);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = data || [];
      const userIds = Array.from(new Set(rows.map((c: any) => c.user_id)));
      let settingsMap: Record<string, string | null> = {};
      if (userIds.length) {
        const [{ data: settings }, { data: profiles }] = await Promise.all([
          supabase.from('user_settings').select('user_id, display_name').in('user_id', userIds),
          supabase.from('profiles').select('user_id, domain_name').in('user_id', userIds),
        ]);
        const domainMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.domain_name]));
        settingsMap = Object.fromEntries(
          (settings || []).map((s: any) => [s.user_id, domainMap[s.user_id] || s.display_name])
        );
        for (const uid of userIds) {
          if (!settingsMap[uid]) settingsMap[uid] = domainMap[uid] || null;
        }
      }

      // Fetch prospect counts for each campaign
      const campaignsWithCounts = await Promise.all(
        rows.map(async (campaign: any) => {
          const { count } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id);

          return {
            ...campaign,
            prospect_count: count || 0,
            user_settings: { display_name: settingsMap[campaign.user_id] || null },
          };
        })
      );

      setCampaigns(campaignsWithCounts as any);

      // Fetch all interest-form responses for these campaigns
      const campaignIds = rows.map((c: any) => c.id);
      if (campaignIds.length) {
        const { data: responses } = await supabase
          .from('campaign_interested_contacts')
          .select('id, campaign_id, contact_name, email, company_name, country, phone, description, recommended_actions, created_at')
          .in('campaign_id', campaignIds)
          .order('created_at', { ascending: false });
        const grouped: Record<string, InterestResponse[]> = {};
        (responses || []).forEach((r: any) => {
          if (!grouped[r.campaign_id]) grouped[r.campaign_id] = [];
          grouped[r.campaign_id].push(r as InterestResponse);
        });
        setResponsesByCampaign(grouped);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: t('adminCampaigns.errorTitle'),
        description: t('adminCampaigns.loadError'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = campaigns;

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(campaign => 
        filters.status.includes(campaign.status)
      );
    }

    // Winery filter (disabled - profiles not loaded)
    // if (filters.winery) {
    //   filtered = filtered.filter(campaign =>
    //     campaign.name.toLowerCase().includes(filters.winery.toLowerCase())
    //   );
    // }

    // Market filter
    if (filters.market && filters.market !== 'all') {
      filtered = filtered.filter(campaign =>
        campaign.target_markets?.includes(filters.market)
      );
    }

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(campaign =>
        campaign.name.toLowerCase().includes(searchTerm)
      );
    }

    // Period filter
    if (filters.period !== 'all') {
      const days = parseInt(filters.period);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      filtered = filtered.filter(campaign =>
        new Date(campaign.created_at) >= cutoffDate
      );
    }

    setFilteredCampaigns(filtered);
  };

  const resetFilters = () => {
    setFilters({
      status: ['pending_validation'],
      winery: '',
      period: '30',
      market: 'all',
      search: ''
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: t('adminCampaigns.copiedTitle'),
      description: t('adminCampaigns.copiedDesc'),
    });
  };

  const validateCampaign = async (campaignId: string, campaignName: string) => {
    if (!confirm(t('adminCampaigns.validateConfirm', { name: campaignName }))) {
      return;
    }

    try {
      const { data, error: fnError } = await supabase.functions
        .invoke('create-campaign', { body: { campaignId } });

      if (fnError || (data && (data as any).error)) {
        throw new Error(fnError?.message || (data as any)?.error || 'create-campaign failed');
      }

      // Notify the user their campaign is validated (best-effort)
      supabase.functions
        .invoke('notify-campaign-validated', { body: { campaignId } })
        .catch((e) => console.error('notify-campaign-validated failed:', e));

      // Reflect new status locally
      setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: 'active' } : c));

      toast({
        title: t('adminCampaigns.validatedTitle'),
        description: t('adminCampaigns.validatedDesc', { name: campaignName }),
      });
    } catch (error) {
      console.error('Error validating campaign:', error);
      toast({
        title: t('adminCampaigns.errorTitle'),
        description: t('adminCampaigns.validateError'),
        variant: "destructive"
      });
    }
  };

  const changeCampaignStatus = async (campaignId: string, newStatus: string, currentStatus: string) => {
    if (newStatus === currentStatus) return;
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', campaignId);
      if (error) throw error;

      setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: newStatus } : c));

      // When manually flipped to active, trigger the user confirmation email
      if (newStatus === 'active' && currentStatus !== 'active') {
        supabase.functions
          .invoke('notify-campaign-validated', { body: { campaignId } })
          .catch((e) => console.error('notify-campaign-validated failed:', e));
      }

      toast({
        title: t('adminCampaigns.statusUpdatedTitle', { defaultValue: 'Statut mis à jour' }),
        description: t(`adminCampaigns.statuses.${newStatus}`, { defaultValue: newStatus }),
      });
    } catch (e: any) {
      console.error('changeCampaignStatus failed:', e);
      toast({
        title: t('adminCampaigns.errorTitle'),
        description: e?.message ?? 'Update failed',
        variant: 'destructive',
      });
    }
  };

  const rejectCampaign = async (campaignId: string, campaignName: string) => {
    const comment = prompt(t('adminCampaigns.rejectPrompt', { name: campaignName }));
    if (!comment) return;

    try {
      const { error: campaignError } = await supabase
        .from('campaigns')
        .update({ 
          status: 'failed',
          admin_reviewer: (await supabase.auth.getUser()).data.user?.id,
          client_note: comment
        })
        .eq('id', campaignId);

      if (campaignError) throw campaignError;

      // Remove from local state immediately (optimistic update)
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));

      toast({
        title: t('adminCampaigns.rejectedTitle'),
        description: t('adminCampaigns.rejectedDesc', { name: campaignName }),
      });
    } catch (error) {
      console.error('Error rejecting campaign:', error);
      toast({
        title: t('adminCampaigns.errorTitle'),
        description: t('adminCampaigns.rejectError'),
        variant: "destructive"
      });
    }
  };

  const markCampaignCompleted = async (campaignId: string, campaignName: string) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: 'results' })
        .eq('id', campaignId);

      if (error) throw error;

      setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: 'results' } : c));

      const { error: notifyErr } = await supabase.functions
        .invoke('notify-campaign-completed', { body: { campaignId } });
      if (notifyErr) {
        console.error('notify-campaign-completed failed:', notifyErr);
        toast({
          title: t('adminCampaigns.completedEmailWarnTitle'),
          description: t('adminCampaigns.completedEmailWarnDesc'),
          variant: 'destructive',
        });
      }

      toast({
        title: t('adminCampaigns.completedTitle'),
        description: t('adminCampaigns.completedDesc', { name: campaignName }),
      });
    } catch (error) {
      console.error('Error marking campaign as completed:', error);
      toast({
        title: t('adminCampaigns.errorTitle'),
        description: t('adminCampaigns.markCompletedError'),
        variant: "destructive"
      });
    }
  };

  const openProspectDrawer = async (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setProspectForm(prev => ({ ...prev, campaign_id: campaign.id }));
    
    // Fetch wines for this campaign's user
    try {
      const { data, error } = await supabase
        .from('wines')
        .select('id, name, color, vintages')
        .eq('user_id', campaign.user_id)
        .eq('is_active', true);

      if (error) throw error;
      setWines(data || []);
    } catch (error) {
      console.error('Error fetching wines:', error);
    }

    setDrawerOpen(true);
  };

  const handleProspectSubmit = async () => {
    try {
      // Validate required fields
      if (!prospectForm.first_name || !prospectForm.last_name || 
          !prospectForm.company_name || !prospectForm.email) {
        toast({
          title: t('adminCampaigns.errorTitle'),
          description: t('adminCampaigns.fillRequired'),
          variant: "destructive"
        });
        return;
      }

      // Check for duplicates
      const { data: existing, error: checkError } = await supabase
        .from('leads')
        .select('id')
        .eq('campaign_id', prospectForm.campaign_id)
        .eq('email', prospectForm.email)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        toast({
          title: t('adminCampaigns.duplicateTitle'),
          description: t('adminCampaigns.duplicateDesc'),
          variant: "destructive"
        });
        return;
      }

      // Create prospect
      const { data: prospect, error: prospectError } = await supabase
        .from('leads')
        .insert({
          campaign_id: prospectForm.campaign_id,
          first_name: prospectForm.first_name,
          last_name: prospectForm.last_name,
          company_name: prospectForm.company_name,
          email: prospectForm.email,
          phone: prospectForm.phone,
          website_url: prospectForm.website_url,
          address_line1: prospectForm.address_line1,
          address_line2: prospectForm.address_line2,
          city: prospectForm.city,
          postal_code: prospectForm.postal_code,
          country: prospectForm.country,
          requested_actions: prospectForm.requested_actions as any,
          requested_other: prospectForm.requested_other,
          tally_response_url: prospectForm.tally_response_url,
          buyer_id: `manual_${Date.now()}`, // Generate unique buyer_id for manual entries
          market: prospectForm.country,
          status: 'new',
          created_by: (await supabase.auth.getUser()).data.user?.id,
          last_activity_at: new Date().toISOString()
        })
        .select()
        .single();

      if (prospectError) throw prospectError;

      // Create sample items if any
      if (sampleItems.length > 0) {
        const { error: samplesError } = await supabase
          .from('sample_items')
          .insert(
            sampleItems.map(item => ({
              lead_id: prospect.id,
              wine_id: item.wine_id,
              quantity: item.quantity,
              comment: item.comment
            }))
          );

        if (samplesError) throw samplesError;
      }

      toast({
        title: t('adminCampaigns.successTitle'),
        description: t('adminCampaigns.createSuccess'),
      });

      // Reset form and close drawer
      setProspectForm({
        campaign_id: '',
        first_name: '',
        last_name: '',
        company_name: '',
        email: '',
        phone: '',
        website_url: '',
        address_line1: '',
        address_line2: '',
        city: '',
        postal_code: '',
        country: 'FR',
        requested_actions: [],
        requested_other: '',
        tally_response_url: ''
      });
      setSampleItems([]);
      setDrawerOpen(false);
      
      // Refresh campaigns to update prospect count
      fetchCampaigns();
    } catch (error) {
      console.error('Error creating prospect:', error);
      toast({
        title: t('adminCampaigns.errorTitle'),
        description: t('adminCampaigns.createError'),
        variant: "destructive"
      });
    }
  };

  const addSampleItem = () => {
    setSampleItems([...sampleItems, { wine_id: '', quantity: 1, comment: '' }]);
  };

  const removeSampleItem = (index: number) => {
    setSampleItems(sampleItems.filter((_, i) => i !== index));
  };

  const updateSampleItem = (index: number, field: string, value: any) => {
    const updated = [...sampleItems];
    updated[index] = { ...updated[index], [field]: value };
    setSampleItems(updated);
  };

  const getStatusBadge = (status: string) => {
    const color = CAMPAIGN_STATUS_COLORS[status as keyof typeof CAMPAIGN_STATUS_COLORS] || 'secondary';
    const label = t(`adminCampaigns.statuses.${status}`, { defaultValue: status });
    return (
      <Badge variant={color as any}>
        {label}
      </Badge>
    );
  };

  const getMarketsBadges = (markets: string[] | null) => {
    if (!markets || markets.length === 0) return '-';
    
    const displayMarkets = markets.slice(0, 3);
    const remainingMarkets = markets.slice(3);
    
    return (
      <div className="flex flex-wrap gap-1">
        {displayMarkets.map(market => (
          <Badge key={market} variant="outline" className="text-xs">
            {market}
          </Badge>
        ))}
        {remainingMarkets.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-foreground cursor-pointer hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
              >
                +{remainingMarkets.length}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto max-w-xs p-3" align="start">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {t('adminCampaigns.table.allMarkets')}
              </p>
              <div className="flex flex-wrap gap-1">
                {markets.map(market => (
                  <Badge key={market} variant="outline" className="text-xs">
                    {market}
                  </Badge>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('adminCampaigns.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('adminCampaigns.subtitle')}
          </p>
        </div>
        <ParseAddressesButton />
      </div>

      {/* Upload campaign report */}
      <AdminCampaignReportUpload />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminCampaigns.filters.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label>{t('adminCampaigns.filters.status')}</Label>
              <Select 
                value={filters.status.join(',')} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value.split(',') }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('adminCampaigns.filters.allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft,pending_validation,active,approved,sending,results,failed">
                    {t('adminCampaigns.filters.allStatuses')}
                  </SelectItem>
                  <SelectItem value="pending_validation,active,approved,sending">
                    {t('adminCampaigns.filters.inProgressDefault')}
                  </SelectItem>
                  <SelectItem value="draft">{t('adminCampaigns.filters.draft')}</SelectItem>
                  <SelectItem value="pending_validation">{t('adminCampaigns.filters.pendingValidation')}</SelectItem>
                  <SelectItem value="active">{t('adminCampaigns.filters.active')}</SelectItem>
                  <SelectItem value="sending">{t('adminCampaigns.filters.sending')}</SelectItem>
                  <SelectItem value="results">{t('adminCampaigns.filters.results')}</SelectItem>
                  <SelectItem value="failed">{t('adminCampaigns.filters.failed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('adminCampaigns.filters.winery')}</Label>
              <Input
                placeholder={t('adminCampaigns.filters.wineryPlaceholder')}
                value={filters.winery}
                onChange={(e) => setFilters(prev => ({ ...prev, winery: e.target.value }))}
              />
            </div>

            <div>
              <Label>{t('adminCampaigns.filters.period')}</Label>
              <Select 
                value={filters.period} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, period: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('adminCampaigns.filters.periodAll')}</SelectItem>
                  <SelectItem value="7">{t('adminCampaigns.filters.period7')}</SelectItem>
                  <SelectItem value="30">{t('adminCampaigns.filters.period30')}</SelectItem>
                  <SelectItem value="90">{t('adminCampaigns.filters.period90')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('adminCampaigns.filters.market')}</Label>
              <Select 
                value={filters.market} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, market: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('adminCampaigns.filters.allMarkets')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('adminCampaigns.filters.allMarkets')}</SelectItem>
                  {COUNTRIES.map(country => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('adminCampaigns.filters.search')}</Label>
              <div className="flex gap-2">
                <Input
                  placeholder={t('adminCampaigns.filters.searchPlaceholder')}
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('adminCampaigns.results.title', { count: filteredCampaigns.length })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCampaigns.length === 0 ? (
            <EmptyState
              icon={<SearchX className="h-10 w-10" />}
              title={t('adminCampaigns.results.emptyTitle')}
              description={t('adminCampaigns.results.emptyDesc')}
              action={{ label: t('adminCampaigns.results.resetFilters'), onClick: resetFilters }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('adminCampaigns.table.date')}</TableHead>
                  <TableHead>{t('adminCampaigns.table.campaign')}</TableHead>
                  <TableHead>{t('adminCampaigns.table.client')}</TableHead>
                  <TableHead>{t('adminCampaigns.table.markets')}</TableHead>
                  <TableHead>{t('adminCampaigns.table.status')}</TableHead>
                  <TableHead>{t('adminCampaigns.table.prospects')}</TableHead>
                  <TableHead>{t('adminCampaigns.table.forms')}</TableHead>
                  <TableHead>{t('adminCampaigns.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((campaign) => (
                  <TableRow key={campaign.id} className="hover:bg-muted/50">
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(campaign.created_at)}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="link" 
                        className="p-0 h-auto font-medium text-left"
                        onClick={() => window.open(`/campaigns/${campaign.id}`, '_blank')}
                      >
                        {campaign.name}
                        <ExternalLink className="h-3 w-3 ml-1 opacity-50" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-sm">
                          {campaign.user_settings?.display_name || campaign.user_id.slice(0, 8) + '...'}
                        </span>
                        {campaign.user_settings?.display_name && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboard(campaign.user_settings?.display_name || '')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getMarketsBadges(campaign.target_markets)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(campaign.status)}
                        <Select
                          value={campaign.status}
                          onValueChange={(v) => changeCampaignStatus(campaign.id, v, campaign.status)}
                        >
                          <SelectTrigger className="h-7 w-[140px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(CAMPAIGN_STATUS_COLORS).map((s) => (
                              <SelectItem key={s} value={s}>
                                {t(`adminCampaigns.statuses.${s}`, { defaultValue: s })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{campaign.prospect_count || 0}</span>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const count = responsesByCampaign[campaign.id]?.length || 0;
                        return (
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto font-medium"
                            disabled={count === 0}
                            onClick={() => setResponsesSheetCampaign(campaign)}
                          >
                            <ClipboardList className="h-3 w-3 mr-1" />
                            {count}
                          </Button>
                        );
                      })()}
                    </TableCell>
                     <TableCell>
                       <div className="flex gap-2">
                         {campaign.status === 'pending_validation' && (
                           <>
                             <Button
                               size="sm"
                               variant="default"
                               onClick={() => validateCampaign(campaign.id, campaign.name)}
                               className="bg-green-600 hover:bg-green-700"
                             >
                               <CheckCircle className="h-4 w-4 mr-1" />
                               {t('adminCampaigns.table.validate')}
                             </Button>
                             <Button
                               size="sm"
                               variant="destructive"
                               onClick={() => rejectCampaign(campaign.id, campaign.name)}
                             >
                               <X className="h-4 w-4 mr-1" />
                               {t('adminCampaigns.table.reject')}
                             </Button>
                           </>
                         )}
                         {(campaign.status === 'active' || campaign.status === 'approved' || campaign.status === 'sending') && (
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => setCompletionPreview({ id: campaign.id, name: campaign.name })}
                           >
                             <CheckCircle className="h-4 w-4 mr-1" />
                             {t('adminCampaigns.table.markCompleted')}
                           </Button>
                         )}
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => openProspectDrawer(campaign)}
                         >
                           <Plus className="h-4 w-4 mr-1" />
                           {t('adminCampaigns.table.addProspect')}
                         </Button>
                         <Button
                           size="sm"
                           variant="outline"
                            onClick={() => setQualifiedSheetCampaign(campaign)}
                         >
                           <Eye className="h-4 w-4 mr-1" />
                           {t('adminCampaigns.table.viewProspects')}
                         </Button>
                         <CampaignInterestedContactsUpload
                           campaignId={campaign.id}
                           campaignName={campaign.name}
                         />
                          <CampaignStatsPopover
                            campaign={campaign}
                            onSaved={fetchCampaigns}
                          />
                          <BrevoSyncButton
                            campaignId={campaign.id}
                            brevoCampaignId={campaign.brevo_campaign_id}
                            onSynced={fetchCampaigns}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`https://wine-exporters.com/interest/${campaign.id}`, '_blank', 'noopener,noreferrer')}
                            title={t('adminCampaigns.interestForm.open')}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            {t('adminCampaigns.interestForm.label')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(`https://wine-exporters.com/interest/${campaign.id}`)}
                            title={t('adminCampaigns.interestForm.copy')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                       </div>
                     </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Email Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Logs des emails envoyés
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchEmailLogs} disabled={logsLoading}>
              <RotateCcw className={`h-4 w-4 ${logsLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : emailLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Aucun email envoyé pour le moment.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Événement</TableHead>
                  <TableHead>Campagne</TableHead>
                  <TableHead>Destinataire</TableHead>
                  <TableHead>Sujet</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline">{log.event_type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.campaign_name}</TableCell>
                    <TableCell className="text-sm">
                      <div>{log.recipient}</div>
                      {log.bcc && (
                        <div className="text-xs text-muted-foreground">Cci : {log.bcc}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs max-w-[260px] truncate" title={log.subject || ''}>
                      {log.subject || '—'}
                    </TableCell>
                    <TableCell>
                      {log.status === 'sent' ? (
                        <Badge className="bg-green-600 hover:bg-green-700">Envoyé</Badge>
                      ) : (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Badge variant="destructive" className="cursor-pointer">Échec</Badge>
                          </PopoverTrigger>
                          <PopoverContent className="max-w-sm text-xs break-words">
                            {log.error_message || 'Erreur inconnue'}
                          </PopoverContent>
                        </Popover>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Prospect Sheet */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {t('adminCampaigns.drawer.title', { name: selectedCampaign?.name ?? '' })}
            </SheetTitle>
          </SheetHeader>
          <div className="pb-6 pt-4 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">{t('adminCampaigns.drawer.firstName')} *</Label>
                <Input
                  id="first_name"
                  value={prospectForm.first_name}
                  onChange={(e) => setProspectForm(prev => ({ ...prev, first_name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="last_name">{t('adminCampaigns.drawer.lastName')} *</Label>
                <Input
                  id="last_name"
                  value={prospectForm.last_name}
                  onChange={(e) => setProspectForm(prev => ({ ...prev, last_name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="company_name">{t('adminCampaigns.drawer.company')} *</Label>
                <Input
                  id="company_name"
                  value={prospectForm.company_name}
                  onChange={(e) => setProspectForm(prev => ({ ...prev, company_name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="email">{t('adminCampaigns.drawer.email')} *</Label>
                <Input
                  id="email"
                  type="email"
                  value={prospectForm.email}
                  onChange={(e) => setProspectForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="phone">{t('adminCampaigns.drawer.phone')}</Label>
                <Input
                  id="phone"
                  value={prospectForm.phone}
                  onChange={(e) => setProspectForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="website_url">{t('adminCampaigns.drawer.website')}</Label>
                <Input
                  id="website_url"
                  value={prospectForm.website_url}
                  onChange={(e) => setProspectForm(prev => ({ ...prev, website_url: e.target.value }))}
                />
              </div>
            </div>

            {/* Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="address_line1">{t('adminCampaigns.drawer.address1')}</Label>
                <Input
                  id="address_line1"
                  value={prospectForm.address_line1}
                  onChange={(e) => setProspectForm(prev => ({ ...prev, address_line1: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="address_line2">{t('adminCampaigns.drawer.address2')}</Label>
                <Input
                  id="address_line2"
                  value={prospectForm.address_line2}
                  onChange={(e) => setProspectForm(prev => ({ ...prev, address_line2: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="city">{t('adminCampaigns.drawer.city')}</Label>
                <Input
                  id="city"
                  value={prospectForm.city}
                  onChange={(e) => setProspectForm(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="postal_code">{t('adminCampaigns.drawer.postalCode')}</Label>
                <Input
                  id="postal_code"
                  value={prospectForm.postal_code}
                  onChange={(e) => setProspectForm(prev => ({ ...prev, postal_code: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="country">{t('adminCampaigns.drawer.country')}</Label>
                <Select 
                  value={prospectForm.country} 
                  onValueChange={(value) => setProspectForm(prev => ({ ...prev, country: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(country => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Requested Actions */}
            <div>
              <Label>{t('adminCampaigns.drawer.requestedActions')}</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {REQUESTED_ACTIONS_VALUES.map(value => (
                  <div key={value} className="flex items-center space-x-2">
                    <Checkbox
                      id={value}
                      checked={prospectForm.requested_actions.includes(value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setProspectForm(prev => ({
                            ...prev,
                            requested_actions: [...prev.requested_actions, value]
                          }));
                        } else {
                          setProspectForm(prev => ({
                            ...prev,
                            requested_actions: prev.requested_actions.filter(a => a !== value)
                          }));
                        }
                      }}
                    />
                    <Label htmlFor={value} className="text-sm">
                      {t(`adminCampaigns.actionsOptions.${value}`)}
                    </Label>
                  </div>
                ))}
              </div>
              {prospectForm.requested_actions.includes('other') && (
                <div className="mt-2">
                  <Label htmlFor="requested_other">{t('adminCampaigns.drawer.specifyOther')}</Label>
                  <Textarea
                    id="requested_other"
                    value={prospectForm.requested_other}
                    onChange={(e) => setProspectForm(prev => ({ ...prev, requested_other: e.target.value }))}
                    placeholder={t('adminCampaigns.drawer.specifyPlaceholder')}
                  />
                </div>
              )}
            </div>

            {/* Tally Response URL */}
            <div>
              <Label htmlFor="tally_response_url">{t('adminCampaigns.drawer.tallyUrl')}</Label>
              <Input
                id="tally_response_url"
                value={prospectForm.tally_response_url}
                onChange={(e) => setProspectForm(prev => ({ ...prev, tally_response_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            {/* Sample Items */}
            <div>
              <div className="flex items-center justify-between">
                <Label>{t('adminCampaigns.drawer.samples')}</Label>
                <Button type="button" variant="outline" size="sm" onClick={addSampleItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  {t('adminCampaigns.drawer.addWine')}
                </Button>
              </div>
              {sampleItems.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2 p-3 border rounded">
                  <div>
                    <Label>{t('adminCampaigns.drawer.wine')}</Label>
                    <Select
                      value={item.wine_id}
                      onValueChange={(value) => updateSampleItem(index, 'wine_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('adminCampaigns.drawer.selectWine')} />
                      </SelectTrigger>
                      <SelectContent>
                        {wines.map(wine => (
                          <SelectItem key={wine.id} value={wine.id}>
                            {wine.name} ({wine.color})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('adminCampaigns.drawer.quantity')}</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateSampleItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <Label>{t('adminCampaigns.drawer.comment')}</Label>
                    <Input
                      value={item.comment}
                      onChange={(e) => updateSampleItem(index, 'comment', e.target.value)}
                      placeholder={t('adminCampaigns.drawer.commentPlaceholder')}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeSampleItem(index)}
                    >
                      {t('adminCampaigns.drawer.remove')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                {t('adminCampaigns.drawer.cancel')}
              </Button>
              <Button onClick={handleProspectSubmit}>
                {t('adminCampaigns.drawer.save')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Interest form responses sheet */}
      <Sheet
        open={!!responsesSheetCampaign}
        onOpenChange={(open) => !open && setResponsesSheetCampaign(null)}
      >
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('adminCampaigns.responsesSheet.title')}</SheetTitle>
            <SheetDescription>
              {responsesSheetCampaign?.name}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-3">
            {(responsesSheetCampaign
              ? responsesByCampaign[responsesSheetCampaign.id] || []
              : []
            ).map((r) => {
              const wantsSamples = /samples|\bsample\b|échantillon/i.test(
                r.recommended_actions || '',
              );
              const enriched = !!(r.description && r.description.trim());
              return (
                <div key={r.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{r.contact_name || '—'}</div>
                      <div className="text-sm text-muted-foreground">
                        {r.email || '—'}
                        {r.phone ? ` · ${r.phone}` : ''}
                      </div>
                    </div>
                    <Badge variant={enriched ? 'default' : 'secondary'}>
                      {enriched
                        ? t('adminCampaigns.responsesSheet.enriched')
                        : t('adminCampaigns.responsesSheet.pending')}
                    </Badge>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">
                      {t('adminCampaigns.responsesSheet.company')}:
                    </span>{' '}
                    {r.company_name || '—'}
                    {r.country ? ` · ${r.country}` : ''}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDateTime(r.created_at)}</span>
                    {wantsSamples && (
                      <Badge variant="outline" className="text-xs">
                        {t('adminCampaigns.responsesSheet.wantsSamples')}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
            {responsesSheetCampaign &&
              (responsesByCampaign[responsesSheetCampaign.id]?.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t('adminCampaigns.responsesSheet.empty')}
                </p>
              )}
          </div>
        </SheetContent>
      </Sheet>

      <CampaignQualifiedProspectsSheet
        campaign={qualifiedSheetCampaign}
        onOpenChange={(open) => !open && setQualifiedSheetCampaign(null)}
      />

      <CampaignCompletionEmailPreview
        campaignId={completionPreview?.id ?? null}
        campaignName={completionPreview?.name ?? ''}
        open={!!completionPreview}
        onOpenChange={(open) => !open && setCompletionPreview(null)}
        onConfirm={async () => {
          if (completionPreview) {
            await markCampaignCompleted(completionPreview.id, completionPreview.name);
          }
        }}
      />
    </div>
  );
}