import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Languages } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

interface Draft {
  full_name: string;
  company_name: string;
  country: string;
  email: string;
  phone: string;
  wine_styles: string;
  origins: string;
  volume: string;
  requirements: string;
  wine_styles_fr: string;
  wine_styles_en: string;
  origins_fr: string;
  origins_en: string;
  volume_fr: string;
  volume_en: string;
  requirements_fr: string;
  requirements_en: string;
  status: string;
}

const EMPTY: Draft = {
  full_name: '', company_name: '', country: '', email: '', phone: '',
  wine_styles: '', origins: '', volume: '', requirements: '',
  wine_styles_fr: '', wine_styles_en: '',
  origins_fr: '', origins_en: '',
  volume_fr: '', volume_en: '',
  requirements_fr: '', requirements_en: '',
  status: 'published',
};

export function ImporterRequestCreateDialog({ open, onOpenChange, onCreated }: Props) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v });

  const reset = () => setDraft(EMPTY);

  const save = async () => {
    if (!draft.full_name.trim() || !draft.company_name.trim() || !draft.email.trim()) {
      toast({ title: 'Champs requis', description: 'Nom, société et email sont obligatoires.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('importer_requests').insert({
      full_name: draft.full_name.trim(),
      company_name: draft.company_name.trim(),
      country: draft.country.trim() || null,
      email: draft.email.trim(),
      phone: draft.phone.trim() || null,
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
      submitted_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Demande créée' });
    reset();
    onOpenChange(false);
    onCreated();
  };

  const translate = async () => {
    setTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-opportunity-fields', {
        body: { entries: [{ id: 'new', fields: {
          wine_styles: draft.wine_styles,
          origins: draft.origins,
          volume: draft.volume,
          requirements: draft.requirements,
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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Ajouter une demande directe</span>
            <Button size="sm" variant="outline" onClick={translate} disabled={translating}>
              {translating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Languages className="h-3.5 w-3.5 mr-1" />}
              Auto-traduire
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Nom *</Label><Input value={draft.full_name} onChange={(e) => set('full_name', e.target.value)} /></div>
          <div><Label>Société *</Label><Input value={draft.company_name} onChange={(e) => set('company_name', e.target.value)} /></div>
          <div><Label>Pays</Label><Input value={draft.country} onChange={(e) => set('country', e.target.value)} /></div>
          <div><Label>Email *</Label><Input type="email" value={draft.email} onChange={(e) => set('email', e.target.value)} /></div>
          <div><Label>Téléphone</Label><Input value={draft.phone} onChange={(e) => set('phone', e.target.value)} /></div>
          <div>
            <Label>Statut</Label>
            <Select value={draft.status} onValueChange={(v) => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="published">Publié</SelectItem>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="archived">Archivé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 border-t pt-3"><div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Types de vin</div></div>
          <div className="md:col-span-2"><Label className="text-xs text-muted-foreground">Brut</Label><Input value={draft.wine_styles} onChange={(e) => set('wine_styles', e.target.value)} /></div>
          <div><Label className="text-xs">FR</Label><Input value={draft.wine_styles_fr} onChange={(e) => set('wine_styles_fr', e.target.value)} /></div>
          <div><Label className="text-xs">EN</Label><Input value={draft.wine_styles_en} onChange={(e) => set('wine_styles_en', e.target.value)} /></div>

          <div className="md:col-span-2 border-t pt-3"><div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Origines</div></div>
          <div className="md:col-span-2"><Label className="text-xs text-muted-foreground">Brut</Label><Input value={draft.origins} onChange={(e) => set('origins', e.target.value)} /></div>
          <div><Label className="text-xs">FR</Label><Input value={draft.origins_fr} onChange={(e) => set('origins_fr', e.target.value)} /></div>
          <div><Label className="text-xs">EN</Label><Input value={draft.origins_en} onChange={(e) => set('origins_en', e.target.value)} /></div>

          <div className="md:col-span-2 border-t pt-3"><div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Volume</div></div>
          <div className="md:col-span-2"><Label className="text-xs text-muted-foreground">Brut</Label><Input value={draft.volume} onChange={(e) => set('volume', e.target.value)} /></div>
          <div><Label className="text-xs">FR</Label><Input value={draft.volume_fr} onChange={(e) => set('volume_fr', e.target.value)} /></div>
          <div><Label className="text-xs">EN</Label><Input value={draft.volume_en} onChange={(e) => set('volume_en', e.target.value)} /></div>

          <div className="md:col-span-2 border-t pt-3"><div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Message</div></div>
          <div className="md:col-span-2"><Label className="text-xs text-muted-foreground">Brut</Label><Textarea rows={2} value={draft.requirements} onChange={(e) => set('requirements', e.target.value)} /></div>
          <div className="md:col-span-2"><Label className="text-xs">FR</Label><Textarea rows={2} value={draft.requirements_fr} onChange={(e) => set('requirements_fr', e.target.value)} /></div>
          <div className="md:col-span-2"><Label className="text-xs">EN</Label><Textarea rows={2} value={draft.requirements_en} onChange={(e) => set('requirements_en', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Annuler</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}