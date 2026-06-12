import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Languages } from 'lucide-react';
import { TenderAgentDialog } from './TenderAgentDialog';

export interface TenderRequestRow {
  id: string;
  reference: string | null;
  market: string | null;
  category: string | null;
  designation_origin: string | null;
  price: string | null;
  available_volume: string | null;
  vintage: string | null;
  deadline_answer: string | null;
  deadline_sample: string | null;
  style_profile: string | null;
  requirements: string | null;
  agent_id: string | null;
  status: string | null;
  category_fr?: string | null;
  category_en?: string | null;
  designation_origin_fr?: string | null;
  designation_origin_en?: string | null;
  available_volume_fr?: string | null;
  available_volume_en?: string | null;
  style_profile_fr?: string | null;
  style_profile_en?: string | null;
  requirements_fr?: string | null;
  requirements_en?: string | null;
}

interface Agent { id: string; name: string; company: string; email: string; phone: string | null; address: string | null }

interface Props {
  row: TenderRequestRow | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}

export function TenderRequestEditDialog({ row, open, onOpenChange, onSaved }: Props) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<TenderRequestRow | null>(row);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentOpen, setAgentOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);

  useEffect(() => { setDraft(row); }, [row]);
  useEffect(() => {
    if (!open) return;
    supabase.from('tender_agents').select('*').order('company').then(({ data }) => setAgents((data ?? []) as any));
  }, [open]);

  if (!draft) return null;

  const set = <K extends keyof TenderRequestRow>(k: K, v: TenderRequestRow[K]) => setDraft({ ...draft, [k]: v });

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('tender_requests').update({
      reference: draft.reference,
      market: draft.market,
      category: draft.category,
      designation_origin: draft.designation_origin,
      price: draft.price,
      available_volume: draft.available_volume,
      vintage: draft.vintage,
      deadline_answer: draft.deadline_answer,
      deadline_sample: draft.deadline_sample,
      style_profile: draft.style_profile,
      requirements: draft.requirements,
      agent_id: draft.agent_id,
      status: draft.status,
      category_fr: draft.category_fr || null,
      category_en: draft.category_en || null,
      designation_origin_fr: draft.designation_origin_fr || null,
      designation_origin_en: draft.designation_origin_en || null,
      available_volume_fr: draft.available_volume_fr || null,
      available_volume_en: draft.available_volume_en || null,
      style_profile_fr: draft.style_profile_fr || null,
      style_profile_en: draft.style_profile_en || null,
      requirements_fr: draft.requirements_fr || null,
      requirements_en: draft.requirements_en || null,
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
          category: draft.category ?? '',
          designation_origin: draft.designation_origin ?? '',
          available_volume: draft.available_volume ?? '',
          style_profile: draft.style_profile ?? '',
          requirements: draft.requirements ?? '',
        } }] },
      });
      if (error) throw error;
      const t = data?.results?.[0]?.translations;
      if (t) setDraft({
        ...draft,
        category_fr: t.category?.fr ?? draft.category_fr, category_en: t.category?.en ?? draft.category_en,
        designation_origin_fr: t.designation_origin?.fr ?? draft.designation_origin_fr, designation_origin_en: t.designation_origin?.en ?? draft.designation_origin_en,
        available_volume_fr: t.available_volume?.fr ?? draft.available_volume_fr, available_volume_en: t.available_volume?.en ?? draft.available_volume_en,
        style_profile_fr: t.style_profile?.fr ?? draft.style_profile_fr, style_profile_en: t.style_profile?.en ?? draft.style_profile_en,
        requirements_fr: t.requirements?.fr ?? draft.requirements_fr, requirements_en: t.requirements?.en ?? draft.requirements_en,
      });
      toast({ title: 'Traduit' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally { setTranslating(false); }
  };

  const remove = async () => {
    if (!window.confirm('Supprimer définitivement cet appel d\'offres ?')) return;
    const { error } = await supabase.from('tender_requests').delete().eq('id', draft.id);
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Supprimé' });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Modifier l'appel d'offres</span>
            <Button size="sm" variant="outline" onClick={retranslate} disabled={translating}>
              {translating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Languages className="h-3.5 w-3.5 mr-1" />}
              Re-traduire
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Référence</Label><Input value={draft.reference ?? ''} onChange={(e) => set('reference', e.target.value)} /></div>
          <div><Label>Marché</Label><Input value={draft.market ?? ''} onChange={(e) => set('market', e.target.value)} /></div>
          <div><Label>Prix</Label><Input value={draft.price ?? ''} onChange={(e) => set('price', e.target.value)} /></div>
          <div><Label>Millésime</Label><Input value={draft.vintage ?? ''} onChange={(e) => set('vintage', e.target.value)} /></div>
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
          <div><Label>Deadline réponse</Label><Input type="date" value={draft.deadline_answer ?? ''} onChange={(e) => set('deadline_answer', e.target.value || null)} /></div>
          <div><Label>Deadline échantillon</Label><Input type="date" value={draft.deadline_sample ?? ''} onChange={(e) => set('deadline_sample', e.target.value || null)} /></div>
          <div className="md:col-span-2">
            <Label>Agent</Label>
            <div className="flex gap-2">
              <Select value={draft.agent_id ?? ''} onValueChange={(v) => set('agent_id', v)}>
                <SelectTrigger><SelectValue placeholder="Choisir un agent" /></SelectTrigger>
                <SelectContent>
                  {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.company} — {a.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={() => setAgentOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />Nouveau
              </Button>
            </div>
          </div>

          <div className="md:col-span-2 border-t pt-3"><div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Catégorie</div></div>
          <div><Label className="text-xs">FR</Label><Input value={draft.category_fr ?? ''} onChange={(e) => set('category_fr', e.target.value)} /></div>
          <div><Label className="text-xs">EN</Label><Input value={draft.category_en ?? ''} onChange={(e) => set('category_en', e.target.value)} /></div>
          <div className="md:col-span-2"><Label className="text-xs text-muted-foreground">Brut (debug)</Label><Input value={draft.category ?? ''} onChange={(e) => set('category', e.target.value)} className="text-xs" /></div>

          <div className="md:col-span-2 border-t pt-3"><div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Désignation / Origine</div></div>
          <div><Label className="text-xs">FR</Label><Input value={draft.designation_origin_fr ?? ''} onChange={(e) => set('designation_origin_fr', e.target.value)} /></div>
          <div><Label className="text-xs">EN</Label><Input value={draft.designation_origin_en ?? ''} onChange={(e) => set('designation_origin_en', e.target.value)} /></div>
          <div className="md:col-span-2"><Label className="text-xs text-muted-foreground">Brut (debug)</Label><Input value={draft.designation_origin ?? ''} onChange={(e) => set('designation_origin', e.target.value)} className="text-xs" /></div>

          <div className="md:col-span-2 border-t pt-3"><div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Volume disponible</div></div>
          <div><Label className="text-xs">FR</Label><Input value={draft.available_volume_fr ?? ''} onChange={(e) => set('available_volume_fr', e.target.value)} /></div>
          <div><Label className="text-xs">EN</Label><Input value={draft.available_volume_en ?? ''} onChange={(e) => set('available_volume_en', e.target.value)} /></div>
          <div className="md:col-span-2"><Label className="text-xs text-muted-foreground">Brut (debug)</Label><Input value={draft.available_volume ?? ''} onChange={(e) => set('available_volume', e.target.value)} className="text-xs" /></div>

          <div className="md:col-span-2 border-t pt-3"><div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Profil recherché</div></div>
          <div className="md:col-span-2"><Label className="text-xs">FR</Label><Textarea rows={2} value={draft.style_profile_fr ?? ''} onChange={(e) => set('style_profile_fr', e.target.value)} /></div>
          <div className="md:col-span-2"><Label className="text-xs">EN</Label><Textarea rows={2} value={draft.style_profile_en ?? ''} onChange={(e) => set('style_profile_en', e.target.value)} /></div>
          <div className="md:col-span-2"><Label className="text-xs text-muted-foreground">Brut (debug)</Label><Textarea rows={2} value={draft.style_profile ?? ''} onChange={(e) => set('style_profile', e.target.value)} className="text-xs" /></div>

          <div className="md:col-span-2 border-t pt-3"><div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Exigences</div></div>
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
        <TenderAgentDialog
          open={agentOpen}
          onOpenChange={setAgentOpen}
          onCreated={(newAgent) => { setAgents(prev => [...prev, newAgent]); set('agent_id', newAgent.id); }}
        />
      </DialogContent>
    </Dialog>
  );
}