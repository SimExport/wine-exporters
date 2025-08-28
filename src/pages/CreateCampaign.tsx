import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const CreateCampaign = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);

  const markets = {
    'Europe': [
      'France', 'Allemagne', 'Italie', 'Espagne', 'Royaume-Uni', 
      'Pays-Bas', 'Belgique', 'Suisse', 'Autriche', 'Suède'
    ],
    'Amérique du Nord': [
      'États-Unis', 'Canada', 'Mexique'
    ],
    'Asie': [
      'Japon', 'Chine', 'Corée du Sud', 'Singapour', 'Hong Kong', 
      'Thaïlande', 'Vietnam', 'Malaisie'
    ]
  };

  const handleMarketToggle = (market: string) => {
    setSelectedMarkets(prev => {
      if (prev.includes(market)) {
        return prev.filter(m => m !== market);
      } else if (prev.length < 7) {
        return [...prev, market];
      } else {
        toast({
          title: "Limite atteinte",
          description: "Vous ne pouvez sélectionner que 7 marchés maximum.",
          variant: "destructive"
        });
        return prev;
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour créer une campagne.",
        variant: "destructive"
      });
      return;
    }

    if (!campaignName.trim()) {
      toast({
        title: "Nom requis",
        description: "Veuillez donner un nom à votre campagne.",
        variant: "destructive"
      });
      return;
    }

    if (selectedMarkets.length < 3) {
      toast({
        title: "Marchés insuffisants",
        description: "Veuillez sélectionner au moins 3 marchés.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('campaigns')
        .insert({
          user_id: user.id,
          name: campaignName.trim(),
          target_markets: selectedMarkets,
          status: 'pending_validation'
        });

      if (error) throw error;

      toast({
        title: "Campagne créée avec succès !",
        description: "Votre campagne sera lancée dans 48 heures maximum après validation par notre équipe.",
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la création de la campagne.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour au tableau de bord
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Créer une nouvelle campagne
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="campaignName">Nom de la campagne</Label>
                <Input
                  id="campaignName"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Ex: Campagne Printemps 2024"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-base font-semibold">
                  Marchés cibles ({selectedMarkets.length}/7)
                </Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Sélectionnez entre 3 et 7 marchés pour votre campagne
                </p>

                {Object.entries(markets).map(([region, countryList]) => (
                  <div key={region} className="mb-6">
                    <h3 className="font-semibold text-lg mb-3">{region}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {countryList.map((country) => (
                        <div key={country} className="flex items-center space-x-2">
                          <Checkbox
                            id={country}
                            checked={selectedMarkets.includes(country)}
                            onCheckedChange={() => handleMarketToggle(country)}
                            disabled={!selectedMarkets.includes(country) && selectedMarkets.length >= 7}
                          />
                          <Label htmlFor={country} className="text-sm">
                            {country}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-6 border-t">
                <div className="text-sm text-muted-foreground">
                  {selectedMarkets.length < 3 && (
                    <span className="text-destructive">
                      Minimum 3 marchés requis
                    </span>
                  )}
                  {selectedMarkets.length >= 3 && (
                    <span className="text-green-600 flex items-center">
                      <Check className="h-4 w-4 mr-1" />
                      Prêt à créer la campagne
                    </span>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={loading || selectedMarkets.length < 3 || !campaignName.trim()}
                >
                  {loading ? 'Création...' : 'Créer la campagne'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateCampaign;