import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

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
      status: draft.status,
    }).eq('id', draft.id);
    setSaving(false);
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Enregistré' });
    onOpenChange(false);
    onSaved();
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
        <DialogHeader><DialogTitle>Modifier la demande</DialogTitle></DialogHeader>
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
          <div className="md:col-span-2"><Label>Types de vin</Label><Input value={draft.wine_styles ?? ''} onChange={(e) => set('wine_styles', e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Origines</Label><Input value={draft.origins ?? ''} onChange={(e) => set('origins', e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Volume</Label><Input value={draft.volume ?? ''} onChange={(e) => set('volume', e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Message</Label><Textarea rows={3} value={draft.requirements ?? ''} onChange={(e) => set('requirements', e.target.value)} /></div>
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