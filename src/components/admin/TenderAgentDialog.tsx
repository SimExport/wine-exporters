import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (agent: { id: string; name: string; company: string; email: string; phone: string | null; address: string | null }) => void;
}

export function TenderAgentDialog({ open, onOpenChange, onCreated }: Props) {
  const { toast } = useToast();
  const [a, setA] = useState({ name: '', company: '', email: '', phone: '', address: '' });

  const save = async () => {
    if (!a.name || !a.company || !a.email) {
      toast({ title: 'Champs requis', description: 'Nom, société et email', variant: 'destructive' });
      return;
    }
    const { data, error } = await supabase.from('tender_agents').insert({
      name: a.name, company: a.company, email: a.email,
      phone: a.phone || null, address: a.address || null,
    }).select().single();
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    onCreated(data as any);
    setA({ name: '', company: '', email: '', phone: '', address: '' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nouvel agent</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nom</Label><Input value={a.name} onChange={(e) => setA({ ...a, name: e.target.value })} /></div>
          <div><Label>Société</Label><Input value={a.company} onChange={(e) => setA({ ...a, company: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" value={a.email} onChange={(e) => setA({ ...a, email: e.target.value })} /></div>
          <div><Label>Téléphone</Label><Input value={a.phone} onChange={(e) => setA({ ...a, phone: e.target.value })} /></div>
          <div><Label>Adresse</Label><Input value={a.address} onChange={(e) => setA({ ...a, address: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={save}>Créer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}