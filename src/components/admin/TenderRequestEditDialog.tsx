import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus } from 'lucide-react';
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
    }).eq('id', draft.id);
    setSaving(false);
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Enregistré' });
    onOpenChange(false);
    onSaved();
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
        <DialogHeader><DialogTitle>Modifier l'appel d'offres</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Référence</Label><Input value={draft.reference ?? ''} onChange={(e) => set('reference', e.target.value)} /></div>
          <div><Label>Marché</Label><Input value={draft.market ?? ''} onChange={(e) => set('market', e.target.value)} /></div>
          <div><Label>Catégorie</Label><Input value={draft.category ?? ''} onChange={(e) => set('category', e.target.value)} /></div>
          <div><Label>Désignation / Origine</Label><Input value={draft.designation_origin ?? ''} onChange={(e) => set('designation_origin', e.target.value)} /></div>
          <div><Label>Prix</Label><Input value={draft.price ?? ''} onChange={(e) => set('price', e.target.value)} /></div>
          <div><Label>Volume disponible</Label><Input value={draft.available_volume ?? ''} onChange={(e) => set('available_volume', e.target.value)} /></div>
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
          <div className="md:col-span-2"><Label>Profil recherché</Label><Textarea rows={3} value={draft.style_profile ?? ''} onChange={(e) => set('style_profile', e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Exigences</Label><Textarea rows={3} value={draft.requirements ?? ''} onChange={(e) => set('requirements', e.target.value)} /></div>
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