import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CampaignStatusBanner } from '@/components/CampaignStatusBanner';
import { ArrowLeft, Globe, Wine, FileText, Calendar, Target, Users, UserPlus, Check, Mail } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '@/lib/format';
import { getOrCreateManualCampaign } from '@/lib/manual-campaign';

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

  useEffect(() => {
    if (id && user) {
      fetchCampaign();
      fetchDocuments();
      fetchWines();
      fetchInterested();
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

      // Fetch prospect count
      const { count } = await supabase
        .from('leads')
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
        .select('id, company_name, email, contact_name, country, score, description, recommended_actions, added_to_crm_by')
        .eq('campaign_id', id)
        .order('score', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      setInterested((data as InterestedContact[]) || []);
    } catch (error) {
      console.error('Error fetching interested contacts:', error);
    }
  };

  const isAdded = (c: InterestedContact) =>
    !!(user && c.added_to_crm_by && c.added_to_crm_by.includes(user.id));

  const addInterestedToCrm = async (c: InterestedContact) => {
    if (!user) return;
    setAddingId(c.id);
    try {
      const manualCampaignId = await getOrCreateManualCampaign(user.id);
      if (c.email) {
        const { data: existing } = await supabase
          .from('leads')
          .select('id')
          .eq('campaign_id', manualCampaignId)
          .eq('email', c.email)
          .maybeSingle();
        if (!existing) {
          const { error: insErr } = await supabase.from('leads').insert({
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
          });
          if (insErr) throw insErr;
        }
      } else {
        const { error: insErr } = await supabase.from('leads').insert({
          campaign_id: manualCampaignId,
          company_name: c.company_name,
          country: c.country,
          buyer_id: c.company_name,
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
        });
        if (insErr) throw insErr;
      }
      const nextAdded = Array.from(new Set([...(c.added_to_crm_by || []), user.id]));
      const { error: updErr } = await supabase
        .from('campaign_interested_contacts')
        .update({ added_to_crm_by: nextAdded })
        .eq('id', c.id);
      if (updErr) throw updErr;
      setInterested((prev) => prev.map((x) => (x.id === c.id ? { ...x, added_to_crm_by: nextAdded } : x)));
      toast({ title: t('campaigns.detail.interestedContacts.addedToast') });
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
              
              <div className="pt-4 space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/prospects?campaign=${campaign.id}`)}
                >
                  {t('campaigns.detail.viewProspects')}
                </Button>
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
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t('campaigns.detail.interestedContactsCard')}
                  <Badge variant="secondary" className="ml-2">{interested.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('campaigns.detail.interestedContacts.company')}</TableHead>
                        <TableHead>{t('campaigns.detail.interestedContacts.contact')}</TableHead>
                        <TableHead className="w-20">{t('campaigns.detail.interestedContacts.score')}</TableHead>
                        <TableHead>{t('campaigns.detail.interestedContacts.description')}</TableHead>
                        <TableHead>{t('campaigns.detail.interestedContacts.actions')}</TableHead>
                        <TableHead className="w-40" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {interested.map((c) => {
                        const added = isAdded(c);
                        return (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">
                              <div>{c.company_name}</div>
                              {c.country && (
                                <div className="text-xs text-muted-foreground">{c.country}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1 text-xs">
                                {c.contact_name && <span>{c.contact_name}</span>}
                                {c.email && (
                                  <a
                                    href={`mailto:${c.email}`}
                                    className="flex items-center gap-1 text-primary hover:underline"
                                  >
                                    <Mail className="h-3 w-3" />
                                    {c.email}
                                  </a>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {c.score != null ? (
                                <Badge
                                  variant={c.score >= 4 ? 'default' : c.score >= 3 ? 'secondary' : 'outline'}
                                >
                                  {c.score}/5
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-md">
                              {c.description || '—'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-xs">
                              {c.recommended_actions || '—'}
                            </TableCell>
                            <TableCell>
                              {added ? (
                                <Badge variant="secondary" className="gap-1">
                                  <Check className="h-3 w-3" />
                                  {t('campaigns.detail.interestedContacts.added')}
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={addingId === c.id}
                                  onClick={() => addInterestedToCrm(c)}
                                >
                                  <UserPlus className="h-3 w-3 mr-1" />
                                  {t('campaigns.detail.interestedContacts.addToCrm')}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;