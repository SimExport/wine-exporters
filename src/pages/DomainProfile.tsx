import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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

  const wineColorOptions: { value: string; labelKey: string }[] = [
    { value: 'Rouge', labelKey: 'domainProfile.production.colors.red' },
    { value: 'Blanc', labelKey: 'domainProfile.production.colors.white' },
    { value: 'Rosé', labelKey: 'domainProfile.production.colors.rose' },
    { value: 'Pétillant', labelKey: 'domainProfile.production.colors.sparkling' },
  ];

  useEffect(() => {
    if (user) {
      loadProfile();
    } else {
      setInitialLoading(false);
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
        title: t('common.error'),
        description: t('domainProfile.loadError'),
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
        title: t('common.success'),
        description: t('domainProfile.saveSuccess')
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: t('common.error'),
        description: t('domainProfile.saveError'),
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
            <h1 className="text-3xl font-bold text-foreground">{t('domainProfile.title')}</h1>
            <p className="text-muted-foreground mt-2">
              {t('domainProfile.subtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('domainProfile.general.title')}</CardTitle>
                <CardDescription>
                  {t('domainProfile.general.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="domain_name">{t('domainProfile.general.domainName')}</Label>
                    <Input
                      id="domain_name"
                      value={formData.domain_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, domain_name: e.target.value }))}
                      placeholder={t('domainProfile.general.domainNamePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">{t('domainProfile.general.location')}</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder={t('domainProfile.general.locationPlaceholder')}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="aoc">{t('domainProfile.general.aoc')}</Label>
                    <Input
                      id="aoc"
                      value={formData.aoc}
                      onChange={(e) => setFormData(prev => ({ ...prev, aoc: e.target.value }))}
                      placeholder={t('domainProfile.general.aocPlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">{t('domainProfile.general.website')}</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      placeholder={t('domainProfile.general.websitePlaceholder')}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('domainProfile.production.title')}</CardTitle>
                <CardDescription>
                  {t('domainProfile.production.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="surface_area">{t('domainProfile.production.surface')}</Label>
                    <Input
                      id="surface_area"
                      type="number"
                      step="0.1"
                      value={formData.surface_area || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        surface_area: e.target.value ? parseFloat(e.target.value) : null 
                      }))}
                      placeholder={t('domainProfile.production.surfacePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bottles_per_year">{t('domainProfile.production.bottles')}</Label>
                    <Input
                      id="bottles_per_year"
                      type="number"
                      value={formData.bottles_per_year || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        bottles_per_year: e.target.value ? parseInt(e.target.value) : null 
                      }))}
                      placeholder={t('domainProfile.production.bottlesPlaceholder')}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>{t('domainProfile.production.wineTypes')}</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {wineColorOptions.map(({ value, labelKey }) => (
                      <div key={value} className="flex items-center space-x-2">
                        <Checkbox
                          id={value}
                          checked={formData.wine_colors.includes(value)}
                          onCheckedChange={(checked) => 
                            handleWineColorChange(value, checked as boolean)
                          }
                        />
                        <Label htmlFor={value} className="text-sm font-normal">
                          {t(labelKey)}
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
                    {t('domainProfile.production.organic')}
                  </Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('domainProfile.varieties.title')}</CardTitle>
                <CardDescription>
                  {t('domainProfile.varieties.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="grape_varieties">{t('domainProfile.varieties.grapes')}</Label>
                  <Textarea
                    id="grape_varieties"
                    value={formData.grape_varieties.join(', ')}
                    onChange={(e) => handleArrayInput('grape_varieties', e.target.value)}
                    placeholder={t('domainProfile.varieties.grapesPlaceholder')}
                    className="min-h-[80px]"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cuvees">{t('domainProfile.varieties.cuvees')}</Label>
                  <Textarea
                    id="cuvees"
                    value={formData.cuvees.join(', ')}
                    onChange={(e) => handleArrayInput('cuvees', e.target.value)}
                    placeholder={t('domainProfile.varieties.cuveesPlaceholder')}
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
                    {t('domainProfile.saving')}
                  </>
                ) : (
                  t('domainProfile.save')
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