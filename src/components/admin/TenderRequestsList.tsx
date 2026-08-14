import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Pencil, Languages, Loader2, Trash2 } from 'lucide-react';
import { TenderRequestEditDialog, TenderRequestRow } from './TenderRequestEditDialog';
import { useToast } from '@/hooks/use-toast';

const PAGE = 10;

type Row = TenderRequestRow & { agent: { company: string } | null };

export function TenderRequestsList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<TenderRequestRow | null>(null);
  const [open, setOpen] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    let q = supabase.from('tender_requests').select('*, agent:tender_agents(company)').order('created_at', { ascending: false });
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data } = await q;
    setRows((data ?? []) as any);
    setPage(0);
    setSelected([]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter]);

  const translateMissing = async () => {
    const missing = rows.filter(r =>
      !r.category_fr || !r.category_en || !r.designation_origin_fr || !r.designation_origin_en
      || !r.available_volume_fr || !r.available_volume_en
    );
    if (missing.length === 0) { toast({ title: 'Tout est déjà traduit' }); return; }
    setTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-opportunity-fields', {
        body: {
          entries: missing.map(r => ({
            id: r.id,
            fields: {
              category: r.category ?? '',
              designation_origin: r.designation_origin ?? '',
              available_volume: r.available_volume ?? '',
              style_profile: r.style_profile ?? '',
              requirements: r.requirements ?? '',
            },
          })),
        },
      });
      if (error) throw error;
      for (const res of (data?.results ?? [])) {
        const t = res.translations ?? {};
        await supabase.from('tender_requests').update({
          category_fr: t.category?.fr ?? null, category_en: t.category?.en ?? null,
          designation_origin_fr: t.designation_origin?.fr ?? null, designation_origin_en: t.designation_origin?.en ?? null,
          available_volume_fr: t.available_volume?.fr ?? null, available_volume_en: t.available_volume?.en ?? null,
          style_profile_fr: t.style_profile?.fr ?? null, style_profile_en: t.style_profile?.en ?? null,
          requirements_fr: t.requirements?.fr ?? null, requirements_en: t.requirements?.en ?? null,
        }).eq('id', res.id);
      }
      toast({ title: 'Traduction terminée', description: `${missing.length} ligne(s) mises à jour` });
      load();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally { setTranslating(false); }
  };

  const pageRows = rows.slice(page * PAGE, page * PAGE + PAGE);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE));
  const allPageSelected = pageRows.length > 0 && pageRows.every(r => selected.includes(r.id));

  const toggleOne = (id: string, checked: boolean) =>
    setSelected(prev => (checked ? [...prev, id] : prev.filter(x => x !== id)));

  const togglePage = (checked: boolean) =>
    setSelected(prev => checked
      ? Array.from(new Set([...prev, ...pageRows.map(r => r.id)]))
      : prev.filter(id => !pageRows.some(r => r.id === id)));

  const deleteSelected = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from('tender_requests').delete().in('id', selected);
      if (error) throw error;
      toast({ title: 'Suppression effectuée', description: `${selected.length} entrée(s) supprimée(s)` });
      load();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally { setDeleting(false); }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Entrées publiées ({rows.length})</div>
          <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" disabled={deleting}>
                  {deleting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
                  Supprimer ({selected.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer {selected.length} entrée(s) ?</AlertDialogTitle>
                  <AlertDialogDescription>Cette action est définitive.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteSelected}>Supprimer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button size="sm" variant="outline" onClick={translateMissing} disabled={translating}>
            {translating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Languages className="h-3.5 w-3.5 mr-1" />}
            Traduire les entrées manquantes
          </Button>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="published">Publié</SelectItem>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="archived">Archivé</SelectItem>
            </SelectContent>
          </Select>
          </div>
        </div>
        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allPageSelected} onCheckedChange={(c) => togglePage(!!c)} aria-label="Tout sélectionner" />
                </TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Marché</TableHead>
                <TableHead>Désignation</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-6">Aucune entrée</TableCell></TableRow>
              )}
              {pageRows.map(r => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Checkbox checked={selected.includes(r.id)} onCheckedChange={(c) => toggleOne(r.id, !!c)} aria-label="Sélectionner" />
                  </TableCell>
                  <TableCell className="text-xs font-mono">{r.reference}</TableCell>
                  <TableCell className="text-xs">{r.market}</TableCell>
                  <TableCell className="text-xs">{r.designation_origin}</TableCell>
                  <TableCell className="text-xs">{r.agent?.company ?? '—'}</TableCell>
                  <TableCell className="text-xs">{r.deadline_answer ?? '—'}</TableCell>
                  <TableCell><Badge variant={r.status === 'published' ? 'default' : 'secondary'} className="text-[10px]">{r.status}</Badge></TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => { const { agent, ...rest } = r as any; setEditing(rest); setOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Modifier
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 text-xs">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Précédent</Button>
            <span>{page + 1} / {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>Suivant</Button>
          </div>
        )}
        <TenderRequestEditDialog row={editing} open={open} onOpenChange={setOpen} onSaved={load} />
      </CardContent>
    </Card>
  );
}