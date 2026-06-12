import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Languages } from 'lucide-react';

export interface ImporterRequestRow {
  id: string;
  full_name: string | null;
  company_name: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  wine_styles: string | null;
  origins: string | null;
  volume: string | null;
  requirements: string | null;
  status: string | null;
  wine_styles_fr?: string | null;
  wine_styles_en?: string | null;
  origins_fr?: string | null;
  origins_en?: string | null;
  volume_fr?: string | null;
  volume_en?: string | null;
  requirements_fr?: string | null;
  requirements_en?: string | null;
}

interface Props {
  row: ImporterRequestRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function ImporterRequestEditDialog({ row, open, onOpenChange, onSaved }: Props) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<ImporterRequestRow | null>(row);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);

  useEffect(() => { setDraft(row); }, [row]);

  if (!draft) return null;

  const set = <K extends keyof ImporterRequestRow>(k: K, v: ImporterRequestRow[K]) =>
    setDraft({ ...draft, [k]: v });

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('importer_requests').update({
      full_name: draft.full_name,
      company_name: draft.company_name,
      country: draft.country,
      email: draft.email,
      phone: draft.phone || null,
      wine_styles: draft.wine_styles || null,
      origins: draft.origins || null,
      volume: draft.volume || null,
      requirements: draft.requirements || null,
      wine_styles_fr: draft.wine_styles_fr || null,
      wine_styles_en: draft.wine_styles_en || null,
      origins_fr: draft.origins_fr || null,
      origins_en: draft.origins_en || null,
      volume_fr: draft.volume_fr || null,
      volume_en: draft.volume_en || null,
      requirements_fr: draft.requirements_fr || null,
      requirements_en: draft.requirements_en || null,
      status: draft.status,
    }).eq('id', draft.id);
    setSaving(false);
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Enregistré' });
    onOpenChange(false);
    onSaved();
  };

  const retranslate = async () => {
    setTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-opportunity-fields', {
        body: { entries: [{ id: draft.id, fields: {
          wine_styles: draft.wine_styles ?? '',
          origins: draft.origins ?? '',
          volume: draft.volume ?? '',
          requirements: draft.requirements ?? '',
        } }] },
      });
      if (error) throw error;
      const t = data?.results?.[0]?.translations;
      if (t) setDraft({
        ...draft,
        wine_styles_fr: t.wine_styles?.fr ?? draft.wine_styles_fr,
        wine_styles_en: t.wine_styles?.en ?? draft.wine_styles_en,
        origins_fr: t.origins?.fr ?? draft.origins_fr,
        origins_en: t.origins?.en ?? draft.origins_en,
        volume_fr: t.volume?.fr ?? draft.volume_fr,
        volume_en: t.volume?.en ?? draft.volume_en,
        requirements_fr: t.requirements?.fr ?? draft.requirements_fr,
        requirements_en: t.requirements?.en ?? draft.requirements_en,
      });
      toast({ title: 'Traduit' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally { setTranslating(false); }
  };

  const remove = async () => {
    if (!window.confirm('Supprimer définitivement cette demande ?')) return;
    const { error } = await supabase.from('importer_requests').delete().eq('id', draft.id);
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Supprimé' });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Modifier la demande</span>
            <Button size="sm" variant="outline" onClick={retranslate} disabled={translating}>
              {translating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Languages className="h-3.5 w-3.5 mr-1" />}
              Re-traduire
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Nom</Label><Input value={draft.full_name ?? ''} onChange={(e) => set('full_name', e.target.value)} /></div>
          <div><Label>Société</Label><Input value={draft.company_name ?? ''} onChange={(e) => set('company_name', e.target.value)} /></div>
          <div><Label>Pays</Label><Input value={draft.country ?? ''} onChange={(e) => set('country', e.target.value)} /></div>
          <div><Label>Email</Label><Input type="email" value={draft.email ?? ''} onChange={(e) => set('email', e.target.value)} /></div>
          <div><Label>Téléphone</Label><Input value={draft.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></div>
          <div>
            <Label>Statut</Label>
            <Select value={draft.status ?? 'published'} onValueChange={(v) => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="published">Publié</SelectItem>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="archived">Archivé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 border-t pt-3"><div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Types de vin</div></div>
          <div><Label className="text-xs">FR</Label><Input value={draft.wine_styles_fr ?? ''} onChange={(e) => set('wine_styles_fr', e.target.value)} /></div>
          <div><Label className="text-xs">EN</Label><Input value={draft.wine_styles_en ?? ''} onChange={(e) => set('wine_styles_en', e.target.value)} /></div>
          <div className="md:col-span-2"><Label className="text-xs text-muted-foreground">Brut (debug)</Label><Input value={draft.wine_styles ?? ''} onChange={(e) => set('wine_styles', e.target.value)} className="text-xs" /></div>

          <div className="md:col-span-2 border-t pt-3"><div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Origines</div></div>
          <div><Label className="text-xs">FR</Label><Input value={draft.origins_fr ?? ''} onChange={(e) => set('origins_fr', e.target.value)} /></div>
          <div><Label className="text-xs">EN</Label><Input value={draft.origins_en ?? ''} onChange={(e) => set('origins_en', e.target.value)} /></div>
          <div className="md:col-span-2"><Label className="text-xs text-muted-foreground">Brut (debug)</Label><Input value={draft.origins ?? ''} onChange={(e) => set('origins', e.target.value)} className="text-xs" /></div>

          <div className="md:col-span-2 border-t pt-3"><div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Volume</div></div>
          <div><Label className="text-xs">FR</Label><Input value={draft.volume_fr ?? ''} onChange={(e) => set('volume_fr', e.target.value)} /></div>
          <div><Label className="text-xs">EN</Label><Input value={draft.volume_en ?? ''} onChange={(e) => set('volume_en', e.target.value)} /></div>
          <div className="md:col-span-2"><Label className="text-xs text-muted-foreground">Brut (debug)</Label><Input value={draft.volume ?? ''} onChange={(e) => set('volume', e.target.value)} className="text-xs" /></div>

          <div className="md:col-span-2 border-t pt-3"><div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Message</div></div>
          <div className="md:col-span-2"><Label className="text-xs">FR</Label><Textarea rows={2} value={draft.requirements_fr ?? ''} onChange={(e) => set('requirements_fr', e.target.value)} /></div>
          <div className="md:col-span-2"><Label className="text-xs">EN</Label><Textarea rows={2} value={draft.requirements_en ?? ''} onChange={(e) => set('requirements_en', e.target.value)} /></div>
          <div className="md:col-span-2"><Label className="text-xs text-muted-foreground">Brut (debug)</Label><Textarea rows={2} value={draft.requirements ?? ''} onChange={(e) => set('requirements', e.target.value)} className="text-xs" /></div>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="destructive" onClick={remove}>Supprimer</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Enregistrer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}