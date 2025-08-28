import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface DomainProfileData {
  domain_name: string;
  location: string;
  aoc: string;
  website: string;
  surface_area: number | null;
  bottles_per_year: number | null;
  organic_conversion: boolean;
  wine_colors: string[];
  grape_varieties: string[];
  cuvees: string[];
}

const DomainProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState<DomainProfileData>({
    domain_name: '',
    location: '',
    aoc: '',
    website: '',
    surface_area: null,
    bottles_per_year: null,
    organic_conversion: false,
    wine_colors: [],
    grape_varieties: [],
    cuvees: []
  });

  const wineColorOptions = ['Rouge', 'Blanc', 'Rosé', 'Pétillant'];

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFormData({
          domain_name: data.domain_name || '',
          location: data.location || '',
          aoc: data.aoc || '',
          website: data.website || '',
          surface_area: data.surface_area,
          bottles_per_year: data.bottles_per_year,
          organic_conversion: data.organic_conversion || false,
          wine_colors: data.wine_colors || [],
          grape_varieties: data.grape_varieties || [],
          cuvees: data.cuvees || []
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les informations du profil.",
        variant: "destructive"
      });
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user?.id,
          ...formData
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Les informations de votre domaine ont été sauvegardées."
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les informations.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWineColorChange = (color: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      wine_colors: checked 
        ? [...prev.wine_colors, color]
        : prev.wine_colors.filter(c => c !== color)
    }));
  };

  const handleArrayInput = (field: 'grape_varieties' | 'cuvees', value: string) => {
    const items = value.split(',').map(item => item.trim()).filter(item => item);
    setFormData(prev => ({
      ...prev,
      [field]: items
    }));
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Configuration du Domaine</h1>
            <p className="text-muted-foreground mt-2">
              Renseignez les informations de votre domaine viticole pour personnaliser votre profil.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations générales</CardTitle>
                <CardDescription>
                  Les informations principales de votre domaine
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="domain_name">Nom du domaine</Label>
                    <Input
                      id="domain_name"
                      value={formData.domain_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, domain_name: e.target.value }))}
                      placeholder="Domaine de la Vallée"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Localisation</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Bordeaux, France"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="aoc">AOC / Appellation</Label>
                    <Input
                      id="aoc"
                      value={formData.aoc}
                      onChange={(e) => setFormData(prev => ({ ...prev, aoc: e.target.value }))}
                      placeholder="AOC Bordeaux"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Site web</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://www.mondomaine.fr"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Production</CardTitle>
                <CardDescription>
                  Informations sur votre production viticole
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="surface_area">Surface (hectares)</Label>
                    <Input
                      id="surface_area"
                      type="number"
                      step="0.1"
                      value={formData.surface_area || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        surface_area: e.target.value ? parseFloat(e.target.value) : null 
                      }))}
                      placeholder="25.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bottles_per_year">Bouteilles par an</Label>
                    <Input
                      id="bottles_per_year"
                      type="number"
                      value={formData.bottles_per_year || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        bottles_per_year: e.target.value ? parseInt(e.target.value) : null 
                      }))}
                      placeholder="150000"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Types de vins produits</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {wineColorOptions.map((color) => (
                      <div key={color} className="flex items-center space-x-2">
                        <Checkbox
                          id={color}
                          checked={formData.wine_colors.includes(color)}
                          onCheckedChange={(checked) => 
                            handleWineColorChange(color, checked as boolean)
                          }
                        />
                        <Label htmlFor={color} className="text-sm font-normal">
                          {color}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="organic_conversion"
                    checked={formData.organic_conversion}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, organic_conversion: checked as boolean }))
                    }
                  />
                  <Label htmlFor="organic_conversion">
                    En conversion biologique ou certifié bio
                  </Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cépages et Cuvées</CardTitle>
                <CardDescription>
                  Détails sur vos cépages et cuvées (séparez par des virgules)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="grape_varieties">Cépages cultivés</Label>
                  <Textarea
                    id="grape_varieties"
                    value={formData.grape_varieties.join(', ')}
                    onChange={(e) => handleArrayInput('grape_varieties', e.target.value)}
                    placeholder="Merlot, Cabernet Sauvignon, Petit Verdot"
                    className="min-h-[80px]"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cuvees">Cuvées produites</Label>
                  <Textarea
                    id="cuvees"
                    value={formData.cuvees.join(', ')}
                    onChange={(e) => handleArrayInput('cuvees', e.target.value)}
                    placeholder="Cuvée Tradition, Cuvée Prestige, Réserve du Château"
                    className="min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading} className="min-w-[150px]">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  'Sauvegarder'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DomainProfile;