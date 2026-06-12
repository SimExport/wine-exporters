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
  wine_styles_fr: string;
  wine_styles_en: string;
  origins_fr: string;
  origins_en: string;
  volume_fr: string;
  volume_en: string;
  requirements_fr: string;
  requirements_en: string;
  translated: boolean;
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
  for (const k of ['wine_styles', 'origins', 'volume', 'requirements']) {
    mapped[`${k}_fr`] = '';
    mapped[`${k}_en`] = '';
  }
  mapped.translated = false;
  return mapped as Row;
}

export function TallyCsvImporter() {
  const [rows, setRows] = useState<Row[]>([]);
  const [importing, setImporting] = useState(false);
  const [translating, setTranslating] = useState(false);
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

  const updateField = (id: string, key: keyof Row, value: string) =>
    setRows(prev => prev.map(r => (r.id === id ? { ...r, [key]: value } : r)));

  const translateSelected = async () => {
    const selected = rows.filter(r => r.selected && !r.translated);
    if (selected.length === 0) {
      toast({ title: 'Rien à traduire', description: 'Lignes déjà traduites ou aucune sélection' });
      return;
    }
    setTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-opportunity-fields', {
        body: {
          entries: selected.map(r => ({
            id: r.id,
            fields: {
              wine_styles: r.wine_styles,
              origins: r.origins,
              volume: r.volume,
              requirements: r.requirements,
            },
          })),
        },
      });
      if (error) throw error;
      const byId = new Map<string, any>();
      for (const res of (data?.results ?? [])) byId.set(res.id, res.translations);
      setRows(prev => prev.map(r => {
        const t = byId.get(r.id);
        if (!t) return r;
        return {
          ...r,
          wine_styles_fr: t.wine_styles?.fr ?? r.wine_styles,
          wine_styles_en: t.wine_styles?.en ?? r.wine_styles,
          origins_fr: t.origins?.fr ?? r.origins,
          origins_en: t.origins?.en ?? r.origins,
          volume_fr: t.volume?.fr ?? r.volume,
          volume_en: t.volume?.en ?? r.volume,
          requirements_fr: t.requirements?.fr ?? r.requirements,
          requirements_en: t.requirements?.en ?? r.requirements,
          translated: true,
        };
      }));
      toast({ title: 'Traduction terminée', description: `${selected.length} ligne(s) traduite(s)` });
    } catch (e: any) {
      toast({ title: 'Erreur traduction', description: e.message, variant: 'destructive' });
    } finally {
      setTranslating(false);
    }
  };

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
        wine_styles_fr: r.wine_styles_fr || r.wine_styles || null,
        wine_styles_en: r.wine_styles_en || r.wine_styles || null,
        origins_fr: r.origins_fr || r.origins || null,
        origins_en: r.origins_en || r.origins || null,
        volume_fr: r.volume_fr || r.volume || null,
        volume_en: r.volume_en || r.volume || null,
        requirements_fr: r.requirements_fr || r.requirements || null,
        requirements_en: r.requirements_en || r.requirements || null,
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
              <div className="flex gap-2">
                <Button variant="outline" onClick={translateSelected} disabled={translating || selectedCount === 0}>
                  {translating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Traduire la sélection
                </Button>
                <Button onClick={handleImport} disabled={importing || selectedCount === 0}>
                  {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Importer la sélection
                </Button>
              </div>
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
                    <TableHead className="min-w-[220px]">Styles (brut / FR / EN)</TableHead>
                    <TableHead className="min-w-[200px]">Origines (brut / FR / EN)</TableHead>
                    <TableHead className="min-w-[200px]">Volume (brut / FR / EN)</TableHead>
                    <TableHead className="min-w-[260px]">Message (brut / FR / EN)</TableHead>
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
                      <TableCell>
                        <div className="text-[10px] text-muted-foreground mb-1">{r.wine_styles}</div>
                        <Input value={r.wine_styles_fr} onChange={(e) => updateField(r.id, 'wine_styles_fr', e.target.value)} placeholder="FR" className="h-7 text-xs mb-1" />
                        <Input value={r.wine_styles_en} onChange={(e) => updateField(r.id, 'wine_styles_en', e.target.value)} placeholder="EN" className="h-7 text-xs" />
                      </TableCell>
                      <TableCell>
                        <div className="text-[10px] text-muted-foreground mb-1">{r.origins}</div>
                        <Input value={r.origins_fr} onChange={(e) => updateField(r.id, 'origins_fr', e.target.value)} placeholder="FR" className="h-7 text-xs mb-1" />
                        <Input value={r.origins_en} onChange={(e) => updateField(r.id, 'origins_en', e.target.value)} placeholder="EN" className="h-7 text-xs" />
                      </TableCell>
                      <TableCell>
                        <div className="text-[10px] text-muted-foreground mb-1">{r.volume}</div>
                        <Input value={r.volume_fr} onChange={(e) => updateField(r.id, 'volume_fr', e.target.value)} placeholder="FR" className="h-7 text-xs mb-1" />
                        <Input value={r.volume_en} onChange={(e) => updateField(r.id, 'volume_en', e.target.value)} placeholder="EN" className="h-7 text-xs" />
                      </TableCell>
                      <TableCell>
                        <Textarea
                          value={r.requirements}
                          onChange={(e) => updateRequirements(r.id, e.target.value)}
                          rows={2}
                          className="text-xs min-h-[40px] mb-1"
                          placeholder="(vide)"
                        />
                        <Textarea value={r.requirements_fr} onChange={(e) => updateField(r.id, 'requirements_fr', e.target.value)} rows={2} className="text-xs min-h-[40px] mb-1" placeholder="FR" />
                        <Textarea value={r.requirements_en} onChange={(e) => updateField(r.id, 'requirements_en', e.target.value)} rows={2} className="text-xs min-h-[40px]" placeholder="EN" />
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