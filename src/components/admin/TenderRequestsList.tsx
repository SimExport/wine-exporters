import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil } from 'lucide-react';
import { TenderRequestEditDialog, TenderRequestRow } from './TenderRequestEditDialog';

const PAGE = 10;

type Row = TenderRequestRow & { agent: { company: string } | null };

export function TenderRequestsList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<TenderRequestRow | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    let q = supabase.from('tender_requests').select('*, agent:tender_agents(company)').order('created_at', { ascending: false });
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data } = await q;
    setRows((data ?? []) as any);
    setPage(0);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter]);

  const pageRows = rows.slice(page * PAGE, page * PAGE + PAGE);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE));

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Entrées publiées ({rows.length})</div>
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
        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
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
                <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">Aucune entrée</TableCell></TableRow>
              )}
              {pageRows.map(r => (
                <TableRow key={r.id}>
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