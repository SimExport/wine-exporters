import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Upload, Trash2, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Agent {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string | null;
  address: string | null;
}

interface ExtractedRef {
  id: string;
  selected: boolean;
  reference: string;
  category: string;
  designation_origin: string;
  price: string;
  available_volume: string;
  vintage: string | null;
  deadline_answer: string | null;
  deadline_sample: string | null;
  style_profile: string;
  requirements: string | null;
  agent_id: string | null;
  category_fr: string;
  category_en: string;
  designation_origin_fr: string;
  designation_origin_en: string;
  available_volume_fr: string;
  available_volume_en: string;
  style_profile_fr: string;
  style_profile_en: string;
  requirements_fr: string;
  requirements_en: string;
}

export function TenderPdfImporter() {
  const [market, setMarket] = useState('');
  const [rows, setRows] = useState<ExtractedRef[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const [newAgent, setNewAgent] = useState<Omit<Agent, 'id'>>({
    name: '', company: '', email: '', phone: '', address: '',
  });
  const { toast } = useToast();

  const loadAgents = async () => {
    const { data } = await supabase.from('tender_agents').select('*').order('company');
    setAgents(data || []);
  };

  useEffect(() => { loadAgents(); }, []);

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFile = async (file: File) => {
    setExtracting(true);
    try {
      const pdf_base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke('extract-tender-pdf', {
        body: { pdf_base64 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMarket(data?.market ?? '');
      const extracted: ExtractedRef[] = (data?.references ?? []).map((r: any, i: number) => ({
        id: `${i}`,
        selected: false,
        reference: r.reference ?? '',
        category: r.category ?? '',
        designation_origin: r.designation_origin ?? '',
        price: r.price ?? '',
        available_volume: r.available_volume ?? '',
        vintage: r.vintage ?? null,
        deadline_answer: r.deadline_answer ?? null,
        deadline_sample: r.deadline_sample ?? null,
        style_profile: r.style_profile ?? '',
        requirements: r.requirements ?? null,
        agent_id: null,
        category_fr: '', category_en: '',
        designation_origin_fr: '', designation_origin_en: '',
        available_volume_fr: '', available_volume_en: '',
        style_profile_fr: '', style_profile_en: '',
        requirements_fr: '', requirements_en: '',
      }));
      setRows(extracted);
      toast({ title: 'PDF analysé', description: `${extracted.length} référence(s) extraite(s)` });

      // Auto-translate
      try {
        const { data: tdata } = await supabase.functions.invoke('translate-opportunity-fields', {
          body: {
            entries: extracted.map(r => ({
              id: r.id,
              fields: {
                category: r.category,
                designation_origin: r.designation_origin,
                available_volume: r.available_volume,
                style_profile: r.style_profile,
                requirements: r.requirements ?? '',
              },
            })),
          },
        });
        const byId = new Map<string, any>();
        for (const res of (tdata?.results ?? [])) byId.set(res.id, res.translations);
        setRows(prev => prev.map(r => {
          const t = byId.get(r.id);
          if (!t) return r;
          return {
            ...r,
            category_fr: t.category?.fr ?? r.category, category_en: t.category?.en ?? r.category,
            designation_origin_fr: t.designation_origin?.fr ?? r.designation_origin, designation_origin_en: t.designation_origin?.en ?? r.designation_origin,
            available_volume_fr: t.available_volume?.fr ?? r.available_volume, available_volume_en: t.available_volume?.en ?? r.available_volume,
            style_profile_fr: t.style_profile?.fr ?? r.style_profile, style_profile_en: t.style_profile?.en ?? r.style_profile,
            requirements_fr: t.requirements?.fr ?? (r.requirements ?? ''), requirements_en: t.requirements?.en ?? (r.requirements ?? ''),
          };
        }));
      } catch (e) {
        console.warn('Translation failed (fallback to raw)', e);
      }
    } catch (e: any) {
      toast({ title: 'Erreur extraction', description: e.message, variant: 'destructive' });
    } finally {
      setExtracting(false);
    }
  };

  const toggleRow = (id: string, v: boolean) =>
    setRows(prev => prev.map(r => (r.id === id ? { ...r, selected: v } : r)));
  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id));
  const setAgent = (id: string, agent_id: string) =>
    setRows(prev => prev.map(r => (r.id === id ? { ...r, agent_id } : r)));

  const handleCreateAgent = async () => {
    if (!newAgent.name || !newAgent.company || !newAgent.email) {
      toast({ title: 'Champs requis', description: 'Nom, société et email', variant: 'destructive' });
      return;
    }
    const { data, error } = await supabase
      .from('tender_agents')
      .insert({
        name: newAgent.name,
        company: newAgent.company,
        email: newAgent.email,
        phone: newAgent.phone || null,
        address: newAgent.address || null,
      })
      .select()
      .single();
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    setAgents(prev => [...prev, data as Agent]);
    setAgentDialogOpen(false);
    setNewAgent({ name: '', company: '', email: '', phone: '', address: '' });
    toast({ title: 'Agent créé' });
  };

  const handleImport = async () => {
    const selected = rows.filter(r => r.selected);
    if (selected.length === 0) {
      toast({ title: 'Aucune ligne sélectionnée', variant: 'destructive' });
      return;
    }
    if (!market) {
      toast({ title: 'Marché manquant', variant: 'destructive' });
      return;
    }
    const missingAgent = selected.find(r => !r.agent_id);
    if (missingAgent) {
      toast({ title: 'Agent manquant', description: 'Chaque référence publiée doit avoir un agent', variant: 'destructive' });
      return;
    }
    setImporting(true);
    try {
      const payload = selected.map(r => ({
        reference: r.reference,
        market,
        category: r.category || null,
        designation_origin: r.designation_origin || null,
        price: r.price || null,
        available_volume: r.available_volume || null,
        vintage: r.vintage,
        deadline_answer: r.deadline_answer,
        deadline_sample: r.deadline_sample,
        style_profile: r.style_profile || null,
        requirements: r.requirements,
        agent_id: r.agent_id,
        status: 'published',
        category_fr: r.category_fr || r.category || null,
        category_en: r.category_en || r.category || null,
        designation_origin_fr: r.designation_origin_fr || r.designation_origin || null,
        designation_origin_en: r.designation_origin_en || r.designation_origin || null,
        available_volume_fr: r.available_volume_fr || r.available_volume || null,
        available_volume_en: r.available_volume_en || r.available_volume || null,
        style_profile_fr: r.style_profile_fr || r.style_profile || null,
        style_profile_en: r.style_profile_en || r.style_profile || null,
        requirements_fr: r.requirements_fr || r.requirements || null,
        requirements_en: r.requirements_en || r.requirements || null,
      }));
      const { error } = await supabase.from('tender_requests').insert(payload);
      if (error) throw error;
      toast({ title: 'Import réussi', description: `${selected.length} appel(s) d'offres publié(s)` });
      setRows([]);
    } catch (e: any) {
      toast({ title: 'Erreur import', description: e.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const selectedCount = rows.filter(r => r.selected).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="p-3 rounded-md bg-muted">
              {extracting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">Importer un PDF d'appel d'offres</div>
              <div className="text-xs text-muted-foreground">Le PDF est envoyé à Claude pour extraction structurée.</div>
            </div>
            <Input
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={extracting}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <Button variant="outline" asChild disabled={extracting}>
              <span>Choisir un fichier</span>
            </Button>
          </label>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Marché (déduit du PDF, modifiable)</Label>
                <Input value={market} onChange={(e) => setMarket(e.target.value)} placeholder="ex: Systembolaget (Suède)" />
              </div>
              <div className="flex items-end justify-end gap-2">
                <Button variant="outline" onClick={() => setAgentDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Nouvel agent
                </Button>
                <Button onClick={handleImport} disabled={importing || selectedCount === 0}>
                  {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Importer ({selectedCount})
                </Button>
              </div>
            </div>

            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Pub.</TableHead>
                    <TableHead>Réf.</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Désignation</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Checkbox checked={r.selected} onCheckedChange={(v) => toggleRow(r.id, !!v)} />
                      </TableCell>
                      <TableCell className="text-xs font-mono">{r.reference}</TableCell>
                      <TableCell className="text-xs">{r.category}</TableCell>
                      <TableCell className="text-xs">{r.designation_origin}</TableCell>
                      <TableCell className="text-xs">{r.price}</TableCell>
                      <TableCell className="text-xs">{r.available_volume}</TableCell>
                      <TableCell className="text-xs">{r.deadline_answer}</TableCell>
                      <TableCell>
                        <Select value={r.agent_id ?? ''} onValueChange={(v) => setAgent(r.id, v)}>
                          <SelectTrigger className="h-8 text-xs w-40">
                            <SelectValue placeholder="Choisir…" />
                          </SelectTrigger>
                          <SelectContent>
                            {agents.map(a => (
                              <SelectItem key={a.id} value={a.id}>{a.company}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => removeRow(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={agentDialogOpen} onOpenChange={setAgentDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvel agent</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nom</Label><Input value={newAgent.name} onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })} /></div>
            <div><Label>Société</Label><Input value={newAgent.company} onChange={(e) => setNewAgent({ ...newAgent, company: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={newAgent.email} onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })} /></div>
            <div><Label>Téléphone</Label><Input value={newAgent.phone ?? ''} onChange={(e) => setNewAgent({ ...newAgent, phone: e.target.value })} /></div>
            <div><Label>Adresse</Label><Input value={newAgent.address ?? ''} onChange={(e) => setNewAgent({ ...newAgent, address: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAgentDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleCreateAgent}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}