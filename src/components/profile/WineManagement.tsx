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
import { Plus, Edit, Copy, Search, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/format';

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
  const { t } = useTranslation('common');
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
        title: t('common.error'),
        description: t('wines.loadError'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWine = async () => {
    if (!formData.name || !formData.color || !formData.exw_price_eur) {
      toast({
        title: t('common.error'),
        description: t('wines.fillRequired'),
        variant: "destructive"
      });
      return;
    }

    const price = parseFloat(formData.exw_price_eur);
    if (price < 0.10 || price > 999.99) {
      toast({
        title: t('common.error'),
        description: t('wines.priceRangeError'),
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
        toast({ title: t('common.success'), description: t('wines.saveSuccess') });
      } else {
        const { error } = await supabase
          .from('wines')
          .insert(payload);
        if (error) throw error;
        toast({ title: t('common.success'), description: t('wines.addedSuccess') });
      }

      setModalOpen(false);
      resetForm();
      loadWines();
    } catch (error) {
      console.error('Error saving wine:', error);
      toast({
        title: t('common.error'),
        description: t('wines.saveError'),
        variant: "destructive"
      });
    }
  };

  const handleDuplicate = (wine: Wine) => {
    setFormData({
      name: `${wine.name} ${t('wines.copySuffix')}`,
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
            <CardTitle>{t('wines.cardTitle')}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t('wines.cardSubtitle')}
            </p>
          </div>
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                {t('wines.addCuvee')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingWine ? t('wines.editCuvee') : t('wines.addCuvee')}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('wines.fields.name')} *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={t('wines.fields.namePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appellation">{t('wines.fields.appellation')}</Label>
                    <Input
                      id="appellation"
                      value={formData.appellation}
                      onChange={(e) => setFormData(prev => ({ ...prev, appellation: e.target.value }))}
                      placeholder={t('wines.fields.appellationPlaceholder')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="color">{t('wines.fields.color')} *</Label>
                    <Select value={formData.color} onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('wines.fields.colorPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {WINE_COLORS.map(color => (
                          <SelectItem key={color} value={color}>{t(`wines.wineColors.${color}`, color)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">{t('wines.fields.price')} *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0.10"
                      max="999.99"
                      value={formData.exw_price_eur}
                      onChange={(e) => setFormData(prev => ({ ...prev, exw_price_eur: e.target.value }))}
                      placeholder={t('wines.fields.pricePlaceholder')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grapes">{t('wines.fields.grapes')}</Label>
                  <Input
                    id="grapes"
                    placeholder={t('wines.fields.grapesPlaceholder')}
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
                  <Label htmlFor="vintages">{t('wines.fields.vintages')}</Label>
                  <Input
                    id="vintages"
                    type="number"
                    placeholder={t('wines.fields.vintagesPlaceholder')}
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
                  <Label>{t('wines.fields.certifications')}</Label>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="organic"
                        checked={formData.organic}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, organic: checked }))}
                      />
                      <Label htmlFor="organic">{t('wines.fields.organic')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="biodynamic"
                        checked={formData.is_biodynamic}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_biodynamic: checked }))}
                      />
                      <Label htmlFor="biodynamic">{t('wines.fields.biodynamic')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="natural"
                        checked={formData.is_natural}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_natural: checked }))}
                      />
                      <Label htmlFor="natural">{t('wines.fields.natural')}</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="awards">{t('wines.fields.awards')}</Label>
                  <Textarea
                    id="awards"
                    value={formData.awards}
                    onChange={(e) => setFormData(prev => ({ ...prev, awards: e.target.value.slice(0, 300) }))}
                    placeholder={t('wines.fields.awardsPlaceholder')}
                    maxLength={300}
                  />
                  <p className="text-xs text-muted-foreground">{t('wines.fields.awardsCount', { count: formData.awards.length })}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t('wines.fields.description')}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={t('wines.fields.descriptionPlaceholder')}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setModalOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={handleSaveWine}>
                    {t('common.save')}
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
                  placeholder={t('wines.search.placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={colorFilter} onValueChange={setColorFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('wines.search.filterColor')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('wines.search.allColors')}</SelectItem>
                {WINE_COLORS.map(color => (
                  <SelectItem key={color} value={color}>{t(`wines.wineColors.${color}`, color)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {paginatedWines.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {filteredWines.length === 0 && wines.length === 0 ? (
                <p>{t('wines.empty')}</p>
              ) : (
                <p>{t('wines.noMatch')}</p>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('wines.table.name')}</TableHead>
                    <TableHead>{t('wines.table.appellation')}</TableHead>
                    <TableHead>{t('wines.table.grapes')}</TableHead>
                    <TableHead>{t('wines.table.color')}</TableHead>
                    <TableHead>{t('wines.table.exw')}</TableHead>
                    <TableHead>{t('wines.table.organic')}</TableHead>
                    <TableHead>{t('wines.table.vintages')}</TableHead>
                    <TableHead className="text-right">{t('wines.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedWines.map((wine) => (
                    <TableRow key={wine.id}>
                      <TableCell className="font-medium">{wine.name}</TableCell>
                      <TableCell>{wine.appellation || '-'}</TableCell>
                      <TableCell>
                        {wine.grapes?.length ? wine.grapes.join(', ') : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{t(`wines.wineColors.${wine.color}`, wine.color)}</Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(wine.exw_price_eur)}</TableCell>
                      <TableCell>
                        <Badge variant={wine.organic ? "default" : "outline"}>
                          {wine.organic ? t('wines.table.yes') : t('wines.table.no')}
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {filteredWines.length === 1
                      ? t('wines.countSingular', { count: filteredWines.length })
                      : t('wines.countPlural', { count: filteredWines.length })}
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
                  <span className="text-sm text-muted-foreground">{t('wines.perPage')}</span>
                </div>
                
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      {t('wines.previous')}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {t('wines.pageOf', { current: currentPage, total: totalPages })}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      {t('wines.next')}
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