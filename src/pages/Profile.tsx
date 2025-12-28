import { useState, useEffect, useRef } from 'react';
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
import { Loader2, Save, Plus, X, ExternalLink, Upload, File, Image as ImageIcon, Play } from 'lucide-react';
import WineManagement from '@/components/profile/WineManagement';

interface ProfileData {
  domain_name: string;
  contact_name: string;
  location: string;
  aoc: string[];
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
  priority_markets: string;
  current_markets: string;
  avoid_markets: string;
  target_buyer_description: string;
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
  const [uploading, setUploading] = useState(false);

  // Refs for file inputs
  const presentationInputRef = useRef<HTMLInputElement>(null);
  const priceListInputRef = useRef<HTMLInputElement>(null);
  const otherDocsInputRef = useRef<HTMLInputElement>(null);
  const techSheetsInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);
  const videosInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<ProfileData>({
    domain_name: '',
    contact_name: '',
    location: '',
    aoc: [],
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
    is_published: false,
    priority_markets: '',
    current_markets: '',
    avoid_markets: '',
    target_buyer_description: ''
  });

  const [documents, setDocuments] = useState<Document[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [activeTab, setActiveTab] = useState('general');

  const wineTypeOptions = ['Rouge', 'Blanc', 'Rosé', 'Pétillant', 'Orange', 'Nature'];
  const certificationOptions = ['Biologique', 'Conversion bio', 'Biodynamique', 'HVE3'];

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
      // Convert aoc array to string for database storage
      const dataToSave = {
        ...formData,
        aoc: formData.aoc.join(', ')
      };
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user?.id,
          ...dataToSave
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

        // Migrate AOC from string to array if needed
        const migrateAoc = () => {
          if (Array.isArray(data.aoc)) {
            return data.aoc;
          }
          if (typeof data.aoc === 'string' && data.aoc.trim()) {
            return [data.aoc.trim()];
          }
          return [];
        };

        setFormData({
          domain_name: data.domain_name || '',
          contact_name: data.contact_name || '',
          location: data.location || '',
          aoc: migrateAoc(),
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
          is_published: data.is_published || false,
          priority_markets: data.priority_markets || '',
          current_markets: data.current_markets || '',
          avoid_markets: data.avoid_markets || '',
          target_buyer_description: data.target_buyer_description || ''
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
      // Convert aoc array to string for database storage
      const dataToSave = {
        ...formData,
        aoc: formData.aoc.join(', ')
      };
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user?.id,
          ...dataToSave
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

  // AOC management functions
  const addAoc = (aoc: string) => {
    if (aoc.trim() && !formData.aoc.includes(aoc.trim())) {
      setFormData(prev => ({
        ...prev,
        aoc: [...prev.aoc, aoc.trim()]
      }));
    }
  };

  const removeAoc = (index: number) => {
    setFormData(prev => ({
      ...prev,
      aoc: prev.aoc.filter((_, i) => i !== index)
    }));
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

  const refetchDocuments = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) setDocuments(data);
  };

  const refetchMedia = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('media')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_index');
    
    if (data) setMedia(data as Media[]);
  };

  // Document update function
  const handleUpdateDocument = async (id: string, updates: Partial<Document>) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setDocuments(prev => prev.map(doc => 
        doc.id === id ? { ...doc, ...updates } : doc
      ));
    } catch (error) {
      console.error('Error updating document:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le document.",
        variant: "destructive"
      });
    }
  };

  // Media update function
  const handleUpdateMedia = async (id: string, updates: Partial<Media>) => {
    try {
      const { error } = await supabase
        .from('media')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setMedia(prev => prev.map(m => 
        m.id === id ? { ...m, ...updates } : m
      ));
    } catch (error) {
      console.error('Error updating media:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le média.",
        variant: "destructive"
      });
    }
  };

  const handleDocumentUpload = async (
    file: File, 
    category: 'presentation' | 'price_list' | 'other' | 'tech_sheet',
    additionalData?: { cuvee?: string; vintage?: number; format?: string; language?: string }
  ) => {
    if (!user) return;

    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 15 Mo",
        variant: "destructive"
      });
      return;
    }

    // Extended MIME types for better compatibility
    const allowedTypes: { [key: string]: string[] } = {
      presentation: [
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      price_list: [
        'application/pdf', 
        'application/vnd.ms-excel', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        'text/csv',
        'text/plain',
        'application/csv',
        'text/x-csv',
        'application/x-csv',
        'text/comma-separated-values',
        'text/x-comma-separated-values',
        'application/excel',
        'application/x-excel',
        'application/x-msexcel'
      ],
      other: [
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
        'application/vnd.ms-excel', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        'text/csv',
        'text/plain',
        'application/csv',
        'text/x-csv',
        'application/x-csv',
        'text/comma-separated-values',
        'text/x-comma-separated-values',
        'application/excel',
        'application/x-excel',
        'application/x-msexcel'
      ],
      tech_sheet: ['application/pdf']
    };

    if (!allowedTypes[category].includes(file.type)) {
      toast({
        title: "Type de fichier non accepté",
        description: "Veuillez sélectionner un fichier au bon format",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    
    try {
      const filePath = `${user.id}/${category}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          title: file.name,
          category: category,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          ...additionalData
        });

      if (dbError) throw dbError;

      await refetchDocuments();

      toast({
        title: "Document ajouté",
        description: "Le document a été uploadé avec succès"
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Erreur d'upload",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleMediaUpload = async (file: File, type: 'image' | 'video') => {
    if (!user) return;

    const maxSize = type === 'image' ? 10 * 1024 * 1024 : 200 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Fichier trop volumineux",
        description: `La taille maximale est de ${type === 'image' ? '10' : '200'} Mo`,
        variant: "destructive"
      });
      return;
    }

    const allowedTypes = type === 'image' 
      ? ['image/jpeg', 'image/jpg', 'image/png']
      : ['video/mp4'];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Type de fichier non accepté",
        description: "Veuillez sélectionner un fichier au bon format",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    
    try {
      const filePath = `${user.id}/${type}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('media')
        .insert({
          user_id: user.id,
          title: file.name,
          type: type,
          file_url: publicUrl
        });

      if (dbError) throw dbError;

      await refetchMedia();

      toast({
        title: "Média ajouté",
        description: "Le fichier a été uploadé avec succès"
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Erreur d'upload",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  // Multiple file upload handlers
  const handleMultipleDocumentUpload = async (
    files: FileList,
    category: 'presentation' | 'price_list' | 'other' | 'tech_sheet'
  ) => {
    for (const file of Array.from(files)) {
      await handleDocumentUpload(file, category);
    }
  };

  const handleMultipleMediaUpload = async (files: FileList, type: 'image' | 'video') => {
    for (const file of Array.from(files)) {
      await handleMediaUpload(file, type);
    }
  };

  const handleDeleteDocument = async (docId: string, fileUrl: string) => {
    try {
      const filePath = fileUrl.split('/documents/')[1];
      
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId);

      if (dbError) throw dbError;

      await refetchDocuments();

      toast({
        title: "Document supprimé",
        description: "Le document a été supprimé avec succès"
      });
    } catch (error: any) {
      toast({
        title: "Erreur de suppression",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteMedia = async (mediaId: string, fileUrl: string) => {
    try {
      const filePath = fileUrl.split('/media/')[1];
      
      const { error: storageError } = await supabase.storage
        .from('media')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('media')
        .delete()
        .eq('id', mediaId);

      if (dbError) throw dbError;

      await refetchMedia();

      toast({
        title: "Média supprimé",
        description: "Le fichier a été supprimé avec succès"
      });
    } catch (error: any) {
      toast({
        title: "Erreur de suppression",
        description: error.message,
        variant: "destructive"
      });
    }
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Votre profil</h1>
              <p className="text-muted-foreground mt-1">
                Gérez les informations de votre domaine visibles par les importateurs.
              </p>
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
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-8 mb-6">
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="markets">Marchés</TabsTrigger>
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
                      <Label htmlFor="contact_name">Votre nom</Label>
                      <Input
                        id="contact_name"
                        value={formData.contact_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
                        placeholder="Jean Dupont"
                      />
                    </div>
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
                  
                  <div className="space-y-2">
                    <Label>AOC / Appellations</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.aoc.map((appellation, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {appellation}
                          <X 
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => removeAoc(index)}
                          />
                        </Badge>
                      ))}
                    </div>
                    <Input
                      placeholder="Ajouter une appellation et appuyez sur Entrée"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addAoc(e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </div>

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

                    <div className="space-y-2">
                      <Label>Cuvées</Label>
                      <div className="flex flex-wrap gap-2">
                        {formData.cuvees.map((cuvee, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {cuvee}
                            <X 
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => removeCuvee(index)}
                            />
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Ajouter une cuvée"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addCuvee(e.currentTarget.value);
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

            <TabsContent value="markets" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Préférences de marché</CardTitle>
                  <CardDescription>
                    Définissez vos marchés cibles et vos préférences pour la prospection
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="priority_markets">Quels marchés souhaitez-vous prioriser ?</Label>
                    <Textarea
                      id="priority_markets"
                      value={formData.priority_markets}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority_markets: e.target.value }))}
                      placeholder="Ex: États-Unis, Japon, Royaume-Uni..."
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="current_markets">Sur quels marchés êtes-vous déjà présents ?</Label>
                    <Textarea
                      id="current_markets"
                      value={formData.current_markets}
                      onChange={(e) => setFormData(prev => ({ ...prev, current_markets: e.target.value }))}
                      placeholder="Ex: France, Belgique, Suisse..."
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="avoid_markets">Quels marchés souhaitez-vous éviter ?</Label>
                    <Textarea
                      id="avoid_markets"
                      value={formData.avoid_markets}
                      onChange={(e) => setFormData(prev => ({ ...prev, avoid_markets: e.target.value }))}
                      placeholder="Ex: Marchés où vous avez déjà un distributeur exclusif..."
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target_buyer_description">Décrivez le type d'acheteurs/importateurs que vous souhaitez cibler</Label>
                    <Textarea
                      id="target_buyer_description"
                      value={formData.target_buyer_description}
                      onChange={(e) => setFormData(prev => ({ ...prev, target_buyer_description: e.target.value }))}
                      placeholder="Ex: Importateurs spécialisés en vins bio, cavistes haut de gamme, restaurateurs étoilés..."
                      className="min-h-[120px]"
                    />
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
                    <input 
                      ref={presentationInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          handleMultipleDocumentUpload(files, 'presentation');
                        }
                        e.target.value = '';
                      }}
                    />
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center mb-4">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Ajoutez votre brochure (.pdf)
                      </p>
                      <Button 
                        type="button"
                        variant="outline" 
                        className="mt-2"
                        onClick={() => presentationInputRef.current?.click()}
                        disabled={uploading}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter un document
                      </Button>
                    </div>
                    {documents.filter(d => d.category === 'presentation').length > 0 && (
                      <div className="space-y-2">
                        {documents.filter(d => d.category === 'presentation').map(doc => (
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
                              <Button 
                                type="button"
                                variant="outline" 
                                size="sm"
                                onClick={() => window.open(doc.file_url, '_blank')}
                              >
                                Voir
                              </Button>
                              <Button 
                                type="button"
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = doc.file_url;
                                  link.download = doc.file_name;
                                  link.click();
                                }}
                              >
                                Télécharger
                              </Button>
                              <Button 
                                type="button"
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleDeleteDocument(doc.id, doc.file_url)}
                              >
                                Supprimer
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
                    <CardTitle>Liste des prix</CardTitle>
                    <CardDescription>
                      Tarifs de vos vins (.pdf/.xls/.xlsx/.csv ≤ 15 Mo)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <input 
                      ref={priceListInputRef}
                      type="file"
                      accept=".pdf,.xls,.xlsx,.csv"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          handleMultipleDocumentUpload(files, 'price_list');
                        }
                        e.target.value = '';
                      }}
                    />
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center mb-4">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Ajoutez votre liste de prix
                      </p>
                      <Button 
                        type="button"
                        variant="outline" 
                        className="mt-2"
                        onClick={() => priceListInputRef.current?.click()}
                        disabled={uploading}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter la liste des prix
                      </Button>
                    </div>
                    {documents.filter(d => d.category === 'price_list').length > 0 && (
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
                              <Button 
                                type="button"
                                variant="outline" 
                                size="sm"
                                onClick={() => window.open(doc.file_url, '_blank')}
                              >
                                Voir
                              </Button>
                              <Button 
                                type="button"
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = doc.file_url;
                                  link.download = doc.file_name;
                                  link.click();
                                }}
                              >
                                Télécharger
                              </Button>
                              <Button 
                                type="button"
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleDeleteDocument(doc.id, doc.file_url)}
                              >
                                Supprimer
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
                    <CardTitle>Autres documents</CardTitle>
                    <CardDescription>
                      Documents complémentaires (.pdf/.doc/.docx/.xls/.xlsx/.csv ≤ 15 Mo)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <input 
                      ref={otherDocsInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          handleMultipleDocumentUpload(files, 'other');
                        }
                        e.target.value = '';
                      }}
                    />
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center mb-4">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Glissez-déposez vos documents ou cliquez pour parcourir
                      </p>
                      <Button 
                        type="button"
                        variant="outline" 
                        className="mt-2"
                        onClick={() => otherDocsInputRef.current?.click()}
                        disabled={uploading}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter des documents
                      </Button>
                    </div>
                    {documents.filter(d => d.category === 'other').length > 0 && (
                      <div className="space-y-2">
                        {documents.filter(d => d.category === 'other').map(doc => (
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
                              <Button 
                                type="button"
                                variant="outline" 
                                size="sm"
                                onClick={() => window.open(doc.file_url, '_blank')}
                              >
                                Voir
                              </Button>
                              <Button 
                                type="button"
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = doc.file_url;
                                  link.download = doc.file_name;
                                  link.click();
                                }}
                              >
                                Télécharger
                              </Button>
                              <Button 
                                type="button"
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleDeleteDocument(doc.id, doc.file_url)}
                              >
                                Supprimer
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

            <TabsContent value="tech-sheets" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Fiches techniques</CardTitle>
                  <CardDescription>
                    Fiches techniques de vos vins (.pdf)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <input 
                    ref={techSheetsInputRef}
                    type="file"
                    accept=".pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        handleMultipleDocumentUpload(files, 'tech_sheet');
                      }
                      e.target.value = '';
                    }}
                  />
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center mb-4">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Glissez-déposez vos fiches techniques (PDF) ou cliquez pour parcourir
                    </p>
                    <Button 
                      type="button"
                      variant="outline" 
                      className="mt-2"
                      onClick={() => techSheetsInputRef.current?.click()}
                      disabled={uploading}
                    >
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
                                    onChange={(e) => handleUpdateDocument(doc.id, { cuvee: e.target.value })}
                                  />
                                </td>
                                <td className="border border-border p-2">
                                  <Input 
                                    value={doc.vintage || ''} 
                                    placeholder="2023"
                                    type="number"
                                    className="w-full"
                                    onChange={(e) => handleUpdateDocument(doc.id, { vintage: e.target.value ? parseInt(e.target.value) : undefined })}
                                  />
                                </td>
                                <td className="border border-border p-2">
                                  <Input 
                                    value={doc.format || ''} 
                                    placeholder="75cl"
                                    className="w-full"
                                    onChange={(e) => handleUpdateDocument(doc.id, { format: e.target.value })}
                                  />
                                </td>
                                <td className="border border-border p-2">
                                  <Input 
                                    value={doc.language || ''} 
                                    placeholder="FR"
                                    className="w-full"
                                    onChange={(e) => handleUpdateDocument(doc.id, { language: e.target.value })}
                                  />
                                </td>
                                <td className="border border-border p-2">
                                  <div className="flex gap-1">
                                    <Button 
                                      type="button"
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => window.open(doc.file_url, '_blank')}
                                    >
                                      Voir
                                    </Button>
                                    <Button 
                                      type="button"
                                      variant="destructive" 
                                      size="sm"
                                      onClick={() => handleDeleteDocument(doc.id, doc.file_url)}
                                    >
                                      Supprimer
                                    </Button>
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
                    <input 
                      ref={photosInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          handleMultipleMediaUpload(files, 'image');
                        }
                        e.target.value = '';
                      }}
                    />
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center mb-4">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Glissez-déposez vos photos ou cliquez pour parcourir
                      </p>
                      <Button 
                        type="button"
                        variant="outline" 
                        className="mt-2"
                        onClick={() => photosInputRef.current?.click()}
                        disabled={uploading}
                      >
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
                                onChange={(e) => handleUpdateMedia(item.id, { title: e.target.value })}
                              />
                              <Input 
                                value={item.credit || ''}
                                placeholder="Crédit"
                                className="text-xs"
                                onChange={(e) => handleUpdateMedia(item.id, { credit: e.target.value })}
                              />
                            </div>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                type="button"
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleDeleteMedia(item.id, item.file_url)}
                              >
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
                    <input 
                      ref={videosInputRef}
                      type="file"
                      accept=".mp4"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          handleMultipleMediaUpload(files, 'video');
                        }
                        e.target.value = '';
                      }}
                    />
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center mb-4">
                      <Play className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Glissez-déposez vos vidéos ou cliquez pour parcourir
                      </p>
                      <Button 
                        type="button"
                        variant="outline" 
                        className="mt-2"
                        onClick={() => videosInputRef.current?.click()}
                        disabled={uploading}
                      >
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
                                onChange={(e) => handleUpdateMedia(item.id, { title: e.target.value })}
                              />
                              <Input 
                                value={item.credit || ''}
                                placeholder="Crédit"
                                className="text-sm"
                                onChange={(e) => handleUpdateMedia(item.id, { credit: e.target.value })}
                              />
                            </div>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                type="button"
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleDeleteMedia(item.id, item.file_url)}
                              >
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
