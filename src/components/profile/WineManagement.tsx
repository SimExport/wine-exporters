import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Copy, Eye, EyeOff, Search, Loader2 } from 'lucide-react';

interface Wine {
  id: string;
  name: string;
  appellation?: string;
  grapes?: string[];
  color: string;
  exw_price_eur: number;
  organic: boolean;
  is_biodynamic?: boolean;
  is_natural?: boolean;
  awards?: string;
  vintages?: number[];
  description?: string;
  is_active: boolean;
}

const WINE_COLORS = ['Rouge', 'Blanc', 'Rosé', 'Pétillant'];

const WineManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWine, setEditingWine] = useState<Wine | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [colorFilter, setColorFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [formData, setFormData] = useState({
    name: '',
    appellation: '',
    grapes: [] as string[],
    color: '',
    exw_price_eur: '',
    organic: false,
    is_biodynamic: false,
    is_natural: false,
    awards: '',
    vintages: [] as number[],
    description: ''
  });

  useEffect(() => {
    if (user) {
      loadWines();
    }
  }, [user]);

  const loadWines = async () => {
    try {
      const { data, error } = await supabase
        .from('wines')
        .select('*')
        .eq('user_id', user?.id)
        .order('name');

      if (error) throw error;
      setWines(data || []);
    } catch (error) {
      console.error('Error loading wines:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les cuvées.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWine = async () => {
    if (!formData.name || !formData.color || !formData.exw_price_eur) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive"
      });
      return;
    }

    const price = parseFloat(formData.exw_price_eur);
    if (price < 0.10 || price > 999.99) {
      toast({
        title: "Erreur",
        description: "Le prix doit être entre 0,10€ et 999,99€.",
        variant: "destructive"
      });
      return;
    }

    try {
      const payload = {
        user_id: user?.id,
        name: formData.name,
        appellation: formData.appellation || null,
        grapes: formData.grapes.length > 0 ? formData.grapes : null,
        color: formData.color,
        exw_price_eur: price,
        organic: formData.organic,
        is_biodynamic: formData.is_biodynamic,
        is_natural: formData.is_natural,
        awards: formData.awards || null,
        vintages: formData.vintages.length > 0 ? formData.vintages : null,
        description: formData.description || null,
        is_active: true
      };

      if (editingWine) {
        const { error } = await supabase
          .from('wines')
          .update(payload)
          .eq('id', editingWine.id);
        if (error) throw error;
        toast({ title: "Succès", description: "Modifications enregistrées" });
      } else {
        const { error } = await supabase
          .from('wines')
          .insert(payload);
        if (error) throw error;
        toast({ title: "Succès", description: "Cuvée ajoutée" });
      }

      setModalOpen(false);
      resetForm();
      loadWines();
    } catch (error) {
      console.error('Error saving wine:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la cuvée.",
        variant: "destructive"
      });
    }
  };

  const handleDuplicate = (wine: Wine) => {
    setFormData({
      name: `${wine.name} (copie)`,
      appellation: wine.appellation || '',
      grapes: wine.grapes || [],
      color: wine.color,
      exw_price_eur: wine.exw_price_eur.toString(),
      organic: wine.organic,
      is_biodynamic: wine.is_biodynamic || false,
      is_natural: wine.is_natural || false,
      awards: wine.awards || '',
      vintages: wine.vintages || [],
      description: wine.description || ''
    });
    setEditingWine(null);
    setModalOpen(true);
  };

  const handleToggleActive = async (wine: Wine) => {
    try {
      const { error } = await supabase
        .from('wines')
        .update({ is_active: !wine.is_active })
        .eq('id', wine.id);

      if (error) throw error;
      toast({ title: "Succès", description: "Statut mis à jour" });
      loadWines();
    } catch (error) {
      console.error('Error updating wine status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut.",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      appellation: '',
      grapes: [],
      color: '',
      exw_price_eur: '',
      organic: false,
      is_biodynamic: false,
      is_natural: false,
      awards: '',
      vintages: [],
      description: ''
    });
    setEditingWine(null);
  };

  const openEditModal = (wine: Wine) => {
    setFormData({
      name: wine.name,
      appellation: wine.appellation || '',
      grapes: wine.grapes || [],
      color: wine.color,
      exw_price_eur: wine.exw_price_eur.toString(),
      organic: wine.organic,
      is_biodynamic: wine.is_biodynamic || false,
      is_natural: wine.is_natural || false,
      awards: wine.awards || '',
      vintages: wine.vintages || [],
      description: wine.description || ''
    });
    setEditingWine(wine);
    setModalOpen(true);
  };

  const handleAddGrape = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = (e.target as HTMLInputElement).value.trim();
      if (value && !formData.grapes.includes(value)) {
        setFormData(prev => ({ ...prev, grapes: [...prev.grapes, value] }));
        (e.target as HTMLInputElement).value = '';
      }
    }
  };

  const handleAddVintage = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = parseInt((e.target as HTMLInputElement).value);
      if (value && value >= 1900 && value <= new Date().getFullYear() + 2 && !formData.vintages.includes(value)) {
        setFormData(prev => ({ ...prev, vintages: [...prev.vintages, value].sort((a, b) => b - a) }));
        (e.target as HTMLInputElement).value = '';
      }
    }
  };

  const filteredWines = wines.filter(wine => {
    const matchesSearch = !searchTerm || 
      wine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wine.appellation?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesColor = colorFilter === 'all' || wine.color === colorFilter;
    return matchesSearch && matchesColor;
  });

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedWines = filteredWines.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(filteredWines.length / itemsPerPage);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="vins">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Vins / Cuvées</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Ajoutez vos cuvées pour les sélectionner directement lors de la création de campagnes.
            </p>
          </div>
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une cuvée
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingWine ? 'Modifier la cuvée' : 'Ajouter une cuvée'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom de la cuvée *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Cuvée Prestige"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appellation">Appellation</Label>
                    <Input
                      id="appellation"
                      value={formData.appellation}
                      onChange={(e) => setFormData(prev => ({ ...prev, appellation: e.target.value }))}
                      placeholder="AOC Bordeaux"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="color">Couleur *</Label>
                    <Select value={formData.color} onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir une couleur" />
                      </SelectTrigger>
                      <SelectContent>
                        {WINE_COLORS.map(color => (
                          <SelectItem key={color} value={color}>{color}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">EXW (€ / 75cl) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0.10"
                      max="999.99"
                      value={formData.exw_price_eur}
                      onChange={(e) => setFormData(prev => ({ ...prev, exw_price_eur: e.target.value }))}
                      placeholder="12.50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grapes">Cépages</Label>
                  <Input
                    id="grapes"
                    placeholder="Tapez un cépage et appuyez sur Entrée"
                    onKeyDown={handleAddGrape}
                  />
                  <div className="flex flex-wrap gap-1">
                    {formData.grapes.map((grape, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {grape}
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ 
                            ...prev, 
                            grapes: prev.grapes.filter((_, i) => i !== index) 
                          }))}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vintages">Millésimes</Label>
                  <Input
                    id="vintages"
                    type="number"
                    placeholder="Tapez un millésime et appuyez sur Entrée"
                    onKeyDown={handleAddVintage}
                  />
                  <div className="flex flex-wrap gap-1">
                    {formData.vintages.map((vintage, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {vintage}
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ 
                            ...prev, 
                            vintages: prev.vintages.filter((_, i) => i !== index) 
                          }))}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Certifications du vin</Label>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="organic"
                        checked={formData.organic}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, organic: checked }))}
                      />
                      <Label htmlFor="organic">Bio</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="biodynamic"
                        checked={formData.is_biodynamic}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_biodynamic: checked }))}
                      />
                      <Label htmlFor="biodynamic">Biodynamie</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="natural"
                        checked={formData.is_natural}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_natural: checked }))}
                      />
                      <Label htmlFor="natural">Nature</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="awards">Notes / Récompenses</Label>
                  <Textarea
                    id="awards"
                    value={formData.awards}
                    onChange={(e) => setFormData(prev => ({ ...prev, awards: e.target.value.slice(0, 300) }))}
                    placeholder="Médaille d'or au concours..."
                    maxLength={300}
                  />
                  <p className="text-xs text-muted-foreground">{formData.awards.length}/300 caractères</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Description détaillée de la cuvée..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setModalOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleSaveWine}>
                    Enregistrer
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom ou appellation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={colorFilter} onValueChange={setColorFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrer par couleur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les couleurs</SelectItem>
                {WINE_COLORS.map(color => (
                  <SelectItem key={color} value={color}>{color}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {paginatedWines.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {filteredWines.length === 0 && wines.length === 0 ? (
                <p>Aucune cuvée. Ajoutez votre première cuvée.</p>
              ) : (
                <p>Aucune cuvée ne correspond aux critères de recherche.</p>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Appellation</TableHead>
                    <TableHead>Cépages</TableHead>
                    <TableHead>Couleur</TableHead>
                    <TableHead>EXW (€)</TableHead>
                    <TableHead>Bio</TableHead>
                    <TableHead>Millésimes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedWines.map((wine) => (
                    <TableRow key={wine.id} className={!wine.is_active ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">{wine.name}</TableCell>
                      <TableCell>{wine.appellation || '-'}</TableCell>
                      <TableCell>
                        {wine.grapes?.length ? wine.grapes.join(', ') : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{wine.color}</Badge>
                      </TableCell>
                      <TableCell>{wine.exw_price_eur.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€</TableCell>
                      <TableCell>
                        <Badge variant={wine.organic ? "default" : "outline"}>
                          {wine.organic ? 'Oui' : 'Non'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {wine.vintages?.length ? wine.vintages.join(', ') : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(wine)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDuplicate(wine)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleToggleActive(wine)}>
                            {wine.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {filteredWines.length} cuvée{filteredWines.length !== 1 ? 's' : ''}
                  </span>
                  <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">par page</span>
                </div>
                
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Précédent
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} sur {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Suivant
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WineManagement;