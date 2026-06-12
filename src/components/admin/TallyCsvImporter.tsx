import { useState } from 'react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const COLUMN_MAP: Record<string, string> = {
  'Full Name': 'full_name',
  'Company Name': 'company_name',
  "Respondent's country": 'country',
  'Email': 'email',
  'Phone': 'phone',
  'Which wine styles are you looking for?': 'wine_styles',
  'Which origins interest you?': 'origins',
  'Approximate annual volume needed': 'volume',
  'Any specific requirements?': 'requirements',
  'Submitted at': 'submitted_at',
};

interface Row {
  id: string;
  selected: boolean;
  full_name: string;
  company_name: string;
  country: string;
  email: string;
  phone: string;
  wine_styles: string;
  origins: string;
  volume: string;
  requirements: string;
  submitted_at: string;
}

function mapRow(record: Record<string, string>, idx: number): Row {
  const get = (key: string) => {
    // tolerate slight variations
    const found = Object.keys(record).find(k => k.trim().toLowerCase() === key.trim().toLowerCase());
    return found ? (record[found] ?? '').trim() : '';
  };
  const mapped: any = { id: `${idx}`, selected: true };
  for (const [csvCol, dbCol] of Object.entries(COLUMN_MAP)) {
    mapped[dbCol] = get(csvCol);
  }
  return mapped as Row;
}

export function TallyCsvImporter() {
  const [rows, setRows] = useState<Row[]>([]);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const handleFile = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsed = result.data.map(mapRow).filter(r => r.email);
        setRows(parsed);
        toast({ title: 'CSV chargé', description: `${parsed.length} ligne(s) prêtes à publier` });
      },
      error: (err) => {
        toast({ title: 'Erreur CSV', description: err.message, variant: 'destructive' });
      },
    });
  };

  const toggleAll = (checked: boolean) =>
    setRows(prev => prev.map(r => ({ ...r, selected: checked })));

  const toggleRow = (id: string, checked: boolean) =>
    setRows(prev => prev.map(r => (r.id === id ? { ...r, selected: checked } : r)));

  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id));

  const updateRequirements = (id: string, value: string) =>
    setRows(prev => prev.map(r => (r.id === id ? { ...r, requirements: value } : r)));

  const handleImport = async () => {
    const selected = rows.filter(r => r.selected);
    if (selected.length === 0) {
      toast({ title: 'Aucune ligne sélectionnée', variant: 'destructive' });
      return;
    }
    setImporting(true);
    try {
      const payload = selected.map(r => ({
        full_name: r.full_name,
        company_name: r.company_name,
        country: r.country || null,
        email: r.email,
        phone: r.phone || null,
        wine_styles: r.wine_styles || null,
        origins: r.origins || null,
        volume: r.volume || null,
        requirements: r.requirements || null,
        submitted_at: r.submitted_at ? new Date(r.submitted_at).toISOString() : null,
        status: 'published',
      }));
      const { error } = await supabase.from('importer_requests').insert(payload);
      if (error) throw error;
      toast({ title: 'Import réussi', description: `${selected.length} demande(s) publiée(s)` });
      setRows([]);
    } catch (e: any) {
      toast({ title: 'Erreur import', description: e.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const allChecked = rows.length > 0 && rows.every(r => r.selected);
  const selectedCount = rows.filter(r => r.selected).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="p-3 rounded-md bg-muted">
              <Upload className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">Importer un export CSV Tally</div>
              <div className="text-xs text-muted-foreground">Colonnes attendues : Full Name, Company Name, Email, etc.</div>
            </div>
            <Input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <Button variant="outline" asChild>
              <span>Choisir un fichier</span>
            </Button>
          </label>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium">{selectedCount}</span> / {rows.length} sélectionné(s)
              </div>
              <Button onClick={handleImport} disabled={importing || selectedCount === 0}>
                {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Importer la sélection
              </Button>
            </div>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox checked={allChecked} onCheckedChange={(v) => toggleAll(!!v)} />
                    </TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Société</TableHead>
                    <TableHead>Pays</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Styles</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead className="min-w-[240px]">Message</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Checkbox checked={r.selected} onCheckedChange={(v) => toggleRow(r.id, !!v)} />
                      </TableCell>
                      <TableCell className="text-xs">{r.full_name}</TableCell>
                      <TableCell className="text-xs">{r.company_name}</TableCell>
                      <TableCell className="text-xs">{r.country}</TableCell>
                      <TableCell className="text-xs">{r.email}</TableCell>
                      <TableCell className="text-xs">{r.wine_styles}</TableCell>
                      <TableCell className="text-xs">{r.volume}</TableCell>
                      <TableCell>
                        <Textarea
                          value={r.requirements}
                          onChange={(e) => updateRequirements(r.id, e.target.value)}
                          rows={2}
                          className="text-xs min-h-[48px] min-w-[240px]"
                          placeholder="(vide)"
                        />
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
    </div>
  );
}