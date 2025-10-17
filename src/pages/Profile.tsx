import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Eye, Plus, X, ExternalLink, Upload, File, Image as ImageIcon, Play } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import WineManagement from '@/components/profile/WineManagement';
// Note: Drag and drop functionality will be implemented later

interface ProfileData {
  domain_name: string;
  location: string;
  aoc: string;
  website: string;
  surface_area: number | null;
  bottles_per_year: number | null;
  organic_conversion: boolean;
  organic_body: string;
  organic_year: number | null;
  wine_colors: string[];
  wine_types: string[];
  certifications: string[];
  grape_varieties: string[];
  cuvees: string[];
  description: string;
  strengths: string[];
  is_published: boolean;
}

interface Document {
  id: string;
  title: string;
  category: string;
  file_url: string;
  file_name: string;
  file_size: number;
  language?: string;
  cuvee?: string;
  vintage?: number;
  format?: string;
}

interface Media {
  id: string;
  title: string;
  type: 'image' | 'video';
  file_url: string;
  thumbnail_url?: string;
  credit: string;
  sort_index: number;
}

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const [formData, setFormData] = useState<ProfileData>({
    domain_name: '',
    location: '',
    aoc: '',
    website: '',
    surface_area: null,
    bottles_per_year: null,
    organic_conversion: false,
    organic_body: '',
    organic_year: null,
    wine_colors: [],
    wine_types: [],
    certifications: [],
    grape_varieties: [],
    cuvees: [],
    description: '',
    strengths: ['', '', ''],
    is_published: false
  });

  const [documents, setDocuments] = useState<Document[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [activeTab, setActiveTab] = useState('general');

  const wineTypeOptions = ['Rouge', 'Blanc', 'Rosé', 'Pétillant', 'Orange', 'Nature'];
  const certificationOptions = ['Biologique', 'Conversion bio', 'Biodynamique', 'HVE3'];

  // Validation logic
  const canPublish = () => {
    return (
      formData.description.length >= 300 &&
      isValidUrl(formData.website) &&
      documents.some(d => d.category === 'presentation') &&
      documents.some(d => d.category === 'price_list')
    );
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return url.startsWith('https://');
    } catch {
      return false;
    }
  };

  // Auto-save functionality
  const triggerAutoSave = () => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    const timer = setTimeout(() => {
      handleAutoSave();
    }, 1000);
    setAutoSaveTimer(timer);
  };

  const handleAutoSave = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user?.id,
          ...formData
        }, {
          onConflict: 'user_id'
        });

      if (!error) {
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Auto-save error:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadProfile();
      loadDocuments();
      loadMedia();
    } else {
      setInitialLoading(false);
    }
  }, [user]);

  // Trigger auto-save when form data changes
  useEffect(() => {
    if (!initialLoading) {
      triggerAutoSave();
    }
  }, [formData]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Migrate old organic data to certifications if needed
        const migrateCertifications = () => {
          if (data.certifications && data.certifications.length > 0) {
            return data.certifications;
          }
          if (data.organic_conversion) {
            return data.organic_body ? ['Biologique'] : ['Conversion bio'];
          }
          return [];
        };

        setFormData({
          domain_name: data.domain_name || '',
          location: data.location || '',
          aoc: data.aoc || '',
          website: data.website || '',
          surface_area: data.surface_area,
          bottles_per_year: data.bottles_per_year,
          organic_conversion: data.organic_conversion || false,
          organic_body: data.organic_body || '',
          organic_year: data.organic_year,
          wine_colors: data.wine_colors || [],
          wine_types: data.wine_types || [],
          certifications: migrateCertifications(),
          grape_varieties: data.grape_varieties || [],
          cuvees: data.cuvees || [],
          description: data.description || '',
          strengths: data.strengths?.length === 3 ? data.strengths : ['', '', ''],
          is_published: data.is_published || false
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

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadMedia = async () => {
    try {
      const { data, error } = await supabase
        .from('media')
        .select('*')
        .eq('user_id', user?.id)
        .order('sort_index');

      if (error) throw error;
      setMedia((data || []) as Media[]);
    } catch (error) {
      console.error('Error loading media:', error);
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
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setLastSaved(new Date());
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

  const handlePublish = async () => {
    if (!canPublish()) {
      toast({
        title: "Publication impossible",
        description: "Veuillez compléter tous les champs requis avant de publier.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user?.id,
          ...formData,
          is_published: true
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setFormData(prev => ({ ...prev, is_published: true }));
      toast({
        title: "Profil publié",
        description: "Votre profil est maintenant visible publiquement."
      });
    } catch (error) {
      console.error('Error publishing profile:', error);
      toast({
        title: "Erreur",
        description: "Impossible de publier le profil.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWineTypeChange = (type: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      wine_types: checked 
        ? [...prev.wine_types, type]
        : prev.wine_types.filter(t => t !== type)
    }));
  };

  const handleCertificationChange = (certification: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      certifications: checked 
        ? [...prev.certifications, certification]
        : prev.certifications.filter(c => c !== certification)
    }));
  };

  const handleStrengthChange = (index: number, value: string) => {
    const newStrengths = [...formData.strengths];
    newStrengths[index] = value.slice(0, 80); // Max 80 characters
    setFormData(prev => ({ ...prev, strengths: newStrengths }));
  };

  const addGrapeVariety = (variety: string) => {
    if (variety.trim() && !formData.grape_varieties.includes(variety.trim())) {
      setFormData(prev => ({
        ...prev,
        grape_varieties: [...prev.grape_varieties, variety.trim()]
      }));
    }
  };

  const removeGrapeVariety = (index: number) => {
    setFormData(prev => ({
      ...prev,
      grape_varieties: prev.grape_varieties.filter((_, i) => i !== index)
    }));
  };

  const addCuvee = (cuvee: string) => {
    if (cuvee.trim() && !formData.cuvees.includes(cuvee.trim())) {
      setFormData(prev => ({
        ...prev,
        cuvees: [...prev.cuvees, cuvee.trim()]
      }));
    }
  };

  const removeCuvee = (index: number) => {
    setFormData(prev => ({
      ...prev,
      cuvees: prev.cuvees.filter((_, i) => i !== index)
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
      <div className="border-b border-border bg-card">
        <div className="max-w-[1100px] mx-auto px-6 py-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Profile</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          <div className="flex items-center justify-between mt-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Profil du domaine</h1>
              {lastSaved && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    Enregistré à {lastSaved.toLocaleTimeString()}
                  </Badge>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleSubmit} 
                disabled={loading}
                variant="default"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Enregistrer
                  </>
                )}
              </Button>
              <Button 
                onClick={handlePublish}
                disabled={!canPublish() || loading}
                variant="secondary"
              >
                <Eye className="mr-2 h-4 w-4" />
                Publier
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7 mb-6">
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="website">Site web</TabsTrigger>
            <TabsTrigger value="wines">Vins</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="tech-sheets">Fiches tech</TabsTrigger>
            <TabsTrigger value="media">Médias</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-6">
            <TabsContent value="general" className="space-y-6">
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
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="aoc">AOC / Appellations</Label>
                      <Input
                        id="aoc"
                        value={formData.aoc}
                        onChange={(e) => setFormData(prev => ({ ...prev, aoc: e.target.value }))}
                        placeholder="Ajoutez vos appellations..."
                      />
                    </div>
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bottles_per_year">Volume annuel (nb de bouteilles)</Label>
                      <Input
                        id="bottles_per_year"
                        type="number"
                        min="0"
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
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {wineTypeOptions.map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={type}
                            checked={formData.wine_types.includes(type)}
                            onCheckedChange={(checked) => 
                              handleWineTypeChange(type, checked as boolean)
                            }
                          />
                          <Label htmlFor={type} className="text-sm font-normal">
                            {type}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Certifications</Label>
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                      {certificationOptions.map((certification) => (
                        <div key={certification} className="flex items-center space-x-2">
                          <Checkbox
                            id={certification}
                            checked={formData.certifications.includes(certification)}
                            onCheckedChange={(checked) => 
                              handleCertificationChange(certification, checked as boolean)
                            }
                          />
                          <Label htmlFor={certification} className="text-sm font-normal">
                            {certification}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Sélectionnez toutes les certifications applicables.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Cépages cultivés</Label>
                      <div className="flex flex-wrap gap-2">
                        {formData.grape_varieties.map((variety, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {variety}
                            <X 
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => removeGrapeVariety(index)}
                            />
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Ajouter un cépage"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addGrapeVariety(e.currentTarget.value);
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                      </div>
                    </div>
                    
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="description" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Description du domaine</CardTitle>
                  <CardDescription>
                    Présentez votre domaine, son histoire, son terroir, ses pratiques (minimum 300 caractères)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Histoire, terroir, pratiques, volumes, marchés..."
                      className="min-h-[200px]"
                    />
                    <div className="text-sm text-muted-foreground">
                      {formData.description.length}/300 caractères minimum
                      {formData.description.length < 300 && (
                        <span className="text-destructive ml-2">
                          (encore {300 - formData.description.length} caractères requis)
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>


            <TabsContent value="website" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Site web</CardTitle>
                  <CardDescription>
                    URL de votre site web (obligatoire, doit commencer par https://)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="website">URL du site web</Label>
                    <div className="flex gap-2">
                      <Input
                        id="website"
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://www.mondomaine.fr"
                        className={!isValidUrl(formData.website) && formData.website ? 'border-destructive' : ''}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!isValidUrl(formData.website)}
                        onClick={() => window.open(formData.website, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Tester
                      </Button>
                    </div>
                    {!isValidUrl(formData.website) && formData.website && (
                      <div className="text-destructive text-sm">
                        L'URL doit être valide et commencer par https://
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="wines" className="space-y-6">
              <WineManagement />
            </TabsContent>

            <TabsContent value="documents" className="space-y-6">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Présentation du domaine</CardTitle>
                    <CardDescription>
                      Brochure ou document de présentation (.pdf/.doc/.docx ≤ 15 Mo)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {documents.filter(d => d.category === 'presentation').length === 0 ? (
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Ajoutez votre brochure (.pdf)
                        </p>
                        <Button variant="outline" className="mt-2">
                          <Plus className="h-4 w-4 mr-2" />
                          Ajouter un document
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {documents.filter(d => d.category === 'presentation').map(doc => (
                          <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <File className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{doc.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {(doc.file_size / 1024 / 1024).toFixed(1)} Mo
                                  {doc.language && <Badge variant="outline" className="ml-2">{doc.language}</Badge>}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">Voir</Button>
                              <Button variant="outline" size="sm">Télécharger</Button>
                              <Button variant="destructive" size="sm">Supprimer</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Liste des prix</CardTitle>
                    <CardDescription>
                      Tarifs de vos vins (.pdf/.xls/.xlsx/.csv ≤ 15 Mo)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {documents.filter(d => d.category === 'price_list').length === 0 ? (
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Ajoutez votre liste de prix
                        </p>
                        <Button variant="outline" className="mt-2">
                          <Plus className="h-4 w-4 mr-2" />
                          Ajouter la liste des prix
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {documents.filter(d => d.category === 'price_list').map(doc => (
                          <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <File className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{doc.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {(doc.file_size / 1024 / 1024).toFixed(1)} Mo
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">Voir</Button>
                              <Button variant="outline" size="sm">Télécharger</Button>
                              <Button variant="destructive" size="sm">Supprimer</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Autres documents</CardTitle>
                    <CardDescription>
                      Documents complémentaires (.pdf/.doc/.docx/.xls/.xlsx/.csv ≤ 15 Mo)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Glissez-déposez vos documents ou cliquez pour parcourir
                      </p>
                      <Button variant="outline" className="mt-2">
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter des documents
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="tech-sheets" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Fiches techniques</CardTitle>
                  <CardDescription>
                    Fiches techniques de vos vins (.pdf)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center mb-4">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Glissez-déposez vos fiches techniques (PDF) ou cliquez pour parcourir
                    </p>
                    <Button variant="outline" className="mt-2">
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter des fiches techniques
                    </Button>
                  </div>

                  {documents.filter(d => d.category === 'tech_sheet').length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Fiches techniques ajoutées</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-border">
                          <thead>
                            <tr className="bg-muted">
                              <th className="border border-border p-2 text-left">Cuvée</th>
                              <th className="border border-border p-2 text-left">Millésime</th>
                              <th className="border border-border p-2 text-left">Format</th>
                              <th className="border border-border p-2 text-left">Langue</th>
                              <th className="border border-border p-2 text-left">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {documents.filter(d => d.category === 'tech_sheet').map(doc => (
                              <tr key={doc.id}>
                                <td className="border border-border p-2">
                                  <Input 
                                    value={doc.cuvee || ''} 
                                    placeholder="Cuvée"
                                    className="w-full"
                                  />
                                </td>
                                <td className="border border-border p-2">
                                  <Input 
                                    value={doc.vintage || ''} 
                                    placeholder="2023"
                                    type="number"
                                    className="w-full"
                                  />
                                </td>
                                <td className="border border-border p-2">
                                  <Input 
                                    value={doc.format || ''} 
                                    placeholder="75cl"
                                    className="w-full"
                                  />
                                </td>
                                <td className="border border-border p-2">
                                  <Input 
                                    value={doc.language || ''} 
                                    placeholder="FR"
                                    className="w-full"
                                  />
                                </td>
                                <td className="border border-border p-2">
                                  <div className="flex gap-1">
                                    <Button variant="outline" size="sm">Voir</Button>
                                    <Button variant="destructive" size="sm">Supprimer</Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="media" className="space-y-6">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Photos</CardTitle>
                    <CardDescription>
                      Images de votre domaine (.jpg/.jpeg/.png ≤ 10 Mo)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center mb-4">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Glissez-déposez vos photos ou cliquez pour parcourir
                      </p>
                      <Button variant="outline" className="mt-2">
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter des photos
                      </Button>
                    </div>

                    {media.filter(m => m.type === 'image').length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {media.filter(m => m.type === 'image').map(item => (
                          <div key={item.id} className="relative group">
                            <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                              <img 
                                src={item.file_url} 
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="mt-2 space-y-1">
                              <Input 
                                value={item.title}
                                placeholder="Titre"
                                className="text-xs"
                              />
                              <Input 
                                value={item.credit}
                                placeholder="Crédit"
                                className="text-xs"
                              />
                            </div>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="destructive" size="sm">
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Vidéos</CardTitle>
                    <CardDescription>
                      Vidéos de présentation (.mp4 ≤ 200 Mo)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center mb-4">
                      <Play className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Glissez-déposez vos vidéos ou cliquez pour parcourir
                      </p>
                      <Button variant="outline" className="mt-2">
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter des vidéos
                      </Button>
                    </div>

                    {media.filter(m => m.type === 'video').length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {media.filter(m => m.type === 'video').map(item => (
                          <div key={item.id} className="relative group">
                            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                              {item.thumbnail_url ? (
                                <img 
                                  src={item.thumbnail_url} 
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Play className="h-12 w-12 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="mt-2 space-y-1">
                              <Input 
                                value={item.title}
                                placeholder="Titre"
                                className="text-sm"
                              />
                              <Input 
                                value={item.credit}
                                placeholder="Crédit"
                                className="text-sm"
                              />
                            </div>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="destructive" size="sm">
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </form>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;