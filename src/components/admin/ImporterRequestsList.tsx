import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Languages, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ImporterRequestEditDialog, ImporterRequestRow } from './ImporterRequestEditDialog';
import { useToast } from '@/hooks/use-toast';

const PAGE = 10;

export function ImporterRequestsList() {
  const [rows, setRows] = useState<ImporterRequestRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<ImporterRequestRow | null>(null);
  const [open, setOpen] = useState(false);
  const [translating, setTranslating] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    let q = supabase.from('importer_requests').select('*').order('created_at', { ascending: false });
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data } = await q;
    setRows((data ?? []) as any);
    setPage(0);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter]);

  const translateMissing = async () => {
    const missing = rows.filter(r =>
      !r.wine_styles_fr || !r.wine_styles_en || !r.origins_fr || !r.origins_en || !r.volume_fr || !r.volume_en
    );
    if (missing.length === 0) { toast({ title: 'Tout est déjà traduit' }); return; }
    setTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-opportunity-fields', {
        body: {
          entries: missing.map(r => ({
            id: r.id,
            fields: {
              wine_styles: r.wine_styles ?? '',
              origins: r.origins ?? '',
              volume: r.volume ?? '',
              requirements: r.requirements ?? '',
            },
          })),
        },
      });
      if (error) throw error;
      for (const res of (data?.results ?? [])) {
        const t = res.translations ?? {};
        await supabase.from('importer_requests').update({
          wine_styles_fr: t.wine_styles?.fr ?? null,
          wine_styles_en: t.wine_styles?.en ?? null,
          origins_fr: t.origins?.fr ?? null,
          origins_en: t.origins?.en ?? null,
          volume_fr: t.volume?.fr ?? null,
          volume_en: t.volume?.en ?? null,
          requirements_fr: t.requirements?.fr ?? null,
          requirements_en: t.requirements?.en ?? null,
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

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Entrées publiées ({rows.length})</div>
          <div className="flex items-center gap-2">
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
                <TableHead>Société</TableHead>
                <TableHead>Pays</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">Aucune entrée</TableCell></TableRow>
              )}
              {pageRows.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{r.company_name}</TableCell>
                  <TableCell className="text-xs">{r.country}</TableCell>
                  <TableCell className="text-xs">{r.email}</TableCell>
                  <TableCell><Badge variant={r.status === 'published' ? 'default' : 'secondary'} className="text-[10px]">{r.status}</Badge></TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>
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
        <ImporterRequestEditDialog row={editing} open={open} onOpenChange={setOpen} onSaved={load} />
      </CardContent>
    </Card>
  );
}