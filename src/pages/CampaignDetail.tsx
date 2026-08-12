import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CampaignStatusBanner } from '@/components/CampaignStatusBanner';
import { ArrowLeft, Globe, Wine, FileText, Calendar, Target } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '@/lib/format';
import { getOrCreateManualCampaign } from '@/lib/manual-campaign';
import { InterestedContactsSection } from '@/components/campaigns/InterestedContactsSection';

interface Campaign {
  id: string;
  name: string;
  status: string;
  target_markets: string[];
  markets: string[];
  selected_wines: string[];
  doc_presentation: string;
  doc_pricelist: string;
  doc_techs: string[];
  techs_link: string;
  client_note: string;
  created_at: string;
  validation_requested_at: string;
  validated_at: string;
  admin_reviewer: string;
  prospect_count?: number;
  stats_opens?: number | null;
  stats_clicks?: number | null;
  audience_estimate?: number | null;
}

interface Document {
  id: string;
  title: string;
  file_name: string;
}

interface Wine {
  id: string;
  name: string;
  color: string;
  appellation: string;
}

interface InterestedContact {
  id: string;
  company_name: string;
  email: string | null;
  contact_name: string | null;
  country: string | null;
  score: number | null;
  description: string | null;
  recommended_actions: string | null;
  added_to_crm_by: string[] | null;
  origin?: 'form' | 'click';
}

const CampaignDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [interested, setInterested] = useState<InterestedContact[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);
  // Map of "email:xxx" / "company:xxx" -> existing CRM lead id for this campaign
  const [crmLeadMap, setCrmLeadMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id && user) {
      fetchCampaign();
      fetchDocuments();
      fetchWines();
      fetchInterested();
      fetchCrmLeads();
    }
  }, [id, user]);

  const fetchCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      // Fetch prospect count (qualified interested contacts)
      const { count } = await supabase
        .from('campaign_interested_contacts')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', id);

      setCampaign({ ...data, prospect_count: count || 0 });
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast({
        title: t('common.error'),
        description: t('campaigns.toasts.loadOneError'),
        variant: "destructive"
      });
      navigate('/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, file_name')
        .eq('user_id', user?.id);

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchWines = async () => {
    try {
      const { data, error } = await supabase
        .from('wines')
        .select('id, name, color, appellation')
        .eq('user_id', user?.id);

      if (error) throw error;
      setWines(data || []);
    } catch (error) {
      console.error('Error fetching wines:', error);
    }
  };

  const fetchInterested = async () => {
    try {
      const { data, error } = await supabase
        .from('campaign_interested_contacts')
        .select('id, company_name, email, contact_name, country, score, description, recommended_actions, added_to_crm_by, origin')
        .eq('campaign_id', id)
        .order('score', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      const list: InterestedContact[] = ((data as any[]) || []).map((r) => ({
        ...(r as InterestedContact),
        // Use the stored origin; fall back to the legacy heuristic when absent.
        origin:
          r.origin === 'click' || r.origin === 'form'
            ? (r.origin as 'click' | 'form')
            : r.contact_name
              ? ('form' as const)
              : ('click' as const),
      }));
      setInterested(list.sort((a, b) => (b.score ?? -1) - (a.score ?? -1)));
    } catch (error) {
      console.error('Error fetching interested contacts:', error);
    }
  };

  const fetchCrmLeads = async () => {
    if (!user || !id) return;
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, email, company_name, created_at')
        .eq('created_by', user.id)
        .eq('source', 'campaign_interest')
        .eq('source_ref', id)
        .is('archived_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const l of data || []) {
        if (l.email) map[`email:${l.email.toLowerCase()}`] = l.id;
        if (l.company_name) map[`company:${l.company_name.toLowerCase()}`] = l.id;
      }
      setCrmLeadMap(map);
    } catch (e) {
      console.error('Error fetching CRM leads for campaign:', e);
    }
  };

  const getLeadId = (c: InterestedContact): string | null =>
    (c.email ? crmLeadMap[`email:${c.email.toLowerCase()}`] : undefined) ||
    (c.company_name ? crmLeadMap[`company:${c.company_name.toLowerCase()}`] : undefined) ||
    null;

  const addInterestedToCrm = async (c: InterestedContact, opts?: { force?: boolean }) => {
    if (!user) return;
    setAddingId(c.id);
    try {
      const manualCampaignId = await getOrCreateManualCampaign(user.id);
      let createdId: string | null = null;
      if (c.email && !opts?.force) {
        const { data: existing } = await supabase
          .from('leads')
          .select('id')
          .eq('campaign_id', manualCampaignId)
          .eq('email', c.email)
          .maybeSingle();
        if (existing) {
          createdId = existing.id;
        } else {
          const { data: ins, error: insErr } = await supabase.from('leads').insert({
            campaign_id: manualCampaignId,
            company_name: c.company_name,
            email: c.email,
            country: c.country,
            buyer_id: c.email || c.company_name,
            market: c.country,
            message_snippet: c.description,
            owner_notes: c.recommended_actions
              ? `Issu de la campagne « ${campaign?.name ?? ''} »\n\nActions recommandées : ${c.recommended_actions}`
              : `Issu de la campagne « ${campaign?.name ?? ''} »`,
            prospect_status: 'new' as any,
            last_activity_at: new Date().toISOString(),
            created_by: user.id,
            source: 'campaign_interest',
            source_ref: campaign?.id ?? null,
            source_score: c.score,
            source_relevance: c.description,
          }).select('id').single();
          if (insErr) throw insErr;
          createdId = ins?.id ?? null;
        }
      } else {
        const { data: ins, error: insErr } = await supabase.from('leads').insert({
          campaign_id: manualCampaignId,
          company_name: c.company_name,
          email: c.email,
          country: c.country,
          buyer_id: c.email || c.company_name,
          market: c.country,
          message_snippet: c.description,
          owner_notes: c.recommended_actions
            ? `Issu de la campagne « ${campaign?.name ?? ''} »\n\nActions recommandées : ${c.recommended_actions}`
            : `Issu de la campagne « ${campaign?.name ?? ''} »`,
          prospect_status: 'new' as any,
          last_activity_at: new Date().toISOString(),
          created_by: user.id,
          source: 'campaign_interest',
          source_ref: campaign?.id ?? null,
          source_score: c.score,
          source_relevance: c.description,
        }).select('id').single();
        if (insErr) throw insErr;
        createdId = ins?.id ?? null;
      }
      const nextAdded = Array.from(new Set([...(c.added_to_crm_by || []), user.id]));
      const { error: updErr } = await supabase
        .from('campaign_interested_contacts')
        .update({ added_to_crm_by: nextAdded })
        .eq('id', c.id);
      if (updErr) throw updErr;
      setInterested((prev) => prev.map((x) => (x.id === c.id ? { ...x, added_to_crm_by: nextAdded } : x)));
      if (createdId) {
        setCrmLeadMap((prev) => {
          const next = { ...prev };
          if (c.email) next[`email:${c.email.toLowerCase()}`] = createdId!;
          if (c.company_name) next[`company:${c.company_name.toLowerCase()}`] = createdId!;
          return next;
        });
      }
      toast({
        title: opts?.force
          ? t('campaigns.detail.interestedContacts.addedAgainToast', { defaultValue: 'Nouvelle fiche créée dans le CRM' })
          : t('campaigns.detail.interestedContacts.addedToast'),
      });
    } catch (e: any) {
      console.error(e);
      toast({ title: t('common.error'), description: e?.message, variant: 'destructive' });
    } finally {
      setAddingId(null);
    }
  };

  const getDocumentTitle = (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    return doc ? doc.title : t('campaigns.detail.documentNotFound');
  };

  const getWineName = (wineId: string) => {
    const wine = wines.find(w => w.id === wineId);
    return wine ? `${wine.name} (${wine.color})` : t('campaigns.detail.wineNotFound');
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'secondary',
      pending_validation: 'outline',
      approved: 'default',
      sending: 'default',
      results: 'secondary',
      failed: 'destructive'
    };

    const labels: Record<string, string> = {
      draft: t('campaigns.status.draft'),
      pending_validation: t('campaigns.status.pending_validation'),
      approved: t('campaigns.status.validatedShort'),
      sending: t('campaigns.status.sendingShort'),
      results: t('campaigns.status.results'),
      failed: t('campaigns.status.failedShort')
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">{t('campaigns.detail.notFound')}</h2>
          <Button onClick={() => navigate('/campaigns')}>
            {t('campaigns.detail.back')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/campaigns')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('campaigns.detail.back')}
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              {getStatusBadge(campaign.status)}
            </div>
            <p className="text-muted-foreground">
              {t('campaigns.detail.createdOn', { date: formatDateTime(campaign.created_at) })}
            </p>
          </div>
        </div>

        {/* Status Banner */}
        <CampaignStatusBanner 
          status={campaign.status}
          validatedAt={campaign.validated_at}
          prospectCount={campaign.prospect_count}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Markets & Targeting */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t('campaigns.detail.marketsCard')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">{t('campaigns.detail.marketsTitle')}</h4>
                <div className="flex flex-wrap gap-2">
                  {(campaign.target_markets || campaign.markets || []).map((market) => (
                    <Badge key={market} variant="outline">
                      {market}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wines */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wine className="h-5 w-5" />
                {t('campaigns.detail.winesCard')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {campaign.selected_wines?.map((wineId) => (
                  <div key={wineId} className="text-sm">
                    • {getWineName(wineId)}
                  </div>
                )) || <p className="text-muted-foreground">{t('campaigns.detail.noWinesSelected')}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('campaigns.detail.documentsCard')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {campaign.doc_presentation && (
                <div>
                  <h5 className="font-medium text-sm">{t('campaigns.detail.presentationLabel')}</h5>
                  <p className="text-sm text-muted-foreground">
                    {getDocumentTitle(campaign.doc_presentation)}
                  </p>
                </div>
              )}
              
              {campaign.doc_pricelist && (
                <div>
                  <h5 className="font-medium text-sm">{t('campaigns.detail.pricelistLabel')}</h5>
                  <p className="text-sm text-muted-foreground">
                    {getDocumentTitle(campaign.doc_pricelist)}
                  </p>
                </div>
              )}

              {campaign.doc_techs && campaign.doc_techs.length > 0 && (
                <div>
                  <h5 className="font-medium text-sm">{t('campaigns.detail.techsLabel')}</h5>
                  {campaign.doc_techs.map((docId) => (
                    <p key={docId} className="text-sm text-muted-foreground">
                      • {getDocumentTitle(docId)}
                    </p>
                  ))}
                </div>
              )}

              {campaign.techs_link && (
                <div>
                  <h5 className="font-medium text-sm">{t('campaigns.detail.techsLinkLabel')}</h5>
                  <a 
                    href={campaign.techs_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {campaign.techs_link}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats & Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {t('campaigns.detail.statsCard')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h5 className="font-medium text-sm">{t('campaigns.detail.prospectsLabel')}</h5>
                <p className="text-2xl font-bold">{campaign.prospect_count || 0}</p>
              </div>
              <div>
                <h5 className="font-medium text-sm">{t('campaigns.detail.openRateLabel')}</h5>
                <p className="text-2xl font-bold">
                  {campaign.stats_opens != null ? campaign.stats_opens : '—'}
                  {campaign.stats_opens != null && campaign.audience_estimate
                    ? (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        ({((campaign.stats_opens / campaign.audience_estimate) * 100).toFixed(1)} %)
                      </span>
                    )
                    : null}
                </p>
              </div>
              <div>
                <h5 className="font-medium text-sm">{t('campaigns.detail.interestedClicksLabel')}</h5>
                <p className="text-2xl font-bold">
                  {campaign.stats_clicks != null ? campaign.stats_clicks : '—'}
                  {campaign.stats_clicks != null && campaign.audience_estimate
                    ? (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        ({((campaign.stats_clicks / campaign.audience_estimate) * 100).toFixed(1)} %)
                      </span>
                    )
                    : null}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {campaign.client_note && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t('campaigns.detail.noteCard')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{campaign.client_note}</p>
              </CardContent>
            </Card>
          )}

          {/* Interested contacts */}
          {interested.length > 0 && (
            <InterestedContactsSection
              contacts={interested}
              currentUserId={user?.id}
              addingId={addingId}
              onAdd={addInterestedToCrm}
              getLeadId={getLeadId}
              onAddAgain={(c) => addInterestedToCrm(c, { force: true })}
              onOpenLead={(leadId) => navigate(`/prospects/${leadId}`)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;