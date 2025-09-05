import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CampaignStatusBanner } from '@/components/CampaignStatusBanner';
import { ArrowLeft, Globe, Wine, FileText, Calendar, Target } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

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

const CampaignDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && user) {
      fetchCampaign();
      fetchDocuments();
      fetchWines();
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
        title: "Erreur",
        description: "Impossible de charger la campagne",
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

  const getDocumentTitle = (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    return doc ? doc.title : 'Document introuvable';
  };

  const getWineName = (wineId: string) => {
    const wine = wines.find(w => w.id === wineId);
    return wine ? `${wine.name} (${wine.color})` : 'Vin introuvable';
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
      draft: 'Brouillon',
      pending_validation: 'En attente de validation',
      approved: 'Validée',
      sending: 'En cours d\'envoi',
      results: 'Terminée',
      failed: 'Refusée'
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
          <h2 className="text-xl font-semibold mb-2">Campagne introuvable</h2>
          <Button onClick={() => navigate('/campaigns')}>
            Retour aux campagnes
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
            Retour aux campagnes
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              {getStatusBadge(campaign.status)}
            </div>
            <p className="text-muted-foreground">
              Créée le {format(new Date(campaign.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
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
                Marchés & Ciblage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Marchés prioritaires</h4>
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
                Vins sélectionnés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {campaign.selected_wines?.map((wineId) => (
                  <div key={wineId} className="text-sm">
                    • {getWineName(wineId)}
                  </div>
                )) || <p className="text-muted-foreground">Aucun vin sélectionné</p>}
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {campaign.doc_presentation && (
                <div>
                  <h5 className="font-medium text-sm">Présentation du domaine</h5>
                  <p className="text-sm text-muted-foreground">
                    {getDocumentTitle(campaign.doc_presentation)}
                  </p>
                </div>
              )}
              
              {campaign.doc_pricelist && (
                <div>
                  <h5 className="font-medium text-sm">Liste des prix</h5>
                  <p className="text-sm text-muted-foreground">
                    {getDocumentTitle(campaign.doc_pricelist)}
                  </p>
                </div>
              )}

              {campaign.doc_techs && campaign.doc_techs.length > 0 && (
                <div>
                  <h5 className="font-medium text-sm">Fiches techniques</h5>
                  {campaign.doc_techs.map((docId) => (
                    <p key={docId} className="text-sm text-muted-foreground">
                      • {getDocumentTitle(docId)}
                    </p>
                  ))}
                </div>
              )}

              {campaign.techs_link && (
                <div>
                  <h5 className="font-medium text-sm">Lien fiches techniques</h5>
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
                Statistiques
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h5 className="font-medium text-sm">Prospects</h5>
                <p className="text-2xl font-bold">{campaign.prospect_count || 0}</p>
              </div>
              
              <div className="pt-4 space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/prospects?campaign=${campaign.id}`)}
                >
                  Voir les prospects
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {campaign.client_note && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Note à l'équipe</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{campaign.client_note}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;