import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2, Send, X, Copy } from 'lucide-react';
import { buildPublication, normalizeCompany, type Submission } from '@/lib/importer-submission';

type Existing = { id: string; company_name: string; email: string; status: string; created_at: string };
type Row = Submission & { duplicates: Existing[] };

export function ImporterSubmissionsQueue({ onPublished }: { onPublished?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDup, setConfirmDup] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const [subs, existing] = await Promise.all([
      supabase.from('importer_opportunity_submissions').select('*').eq('status', 'pending').order('created_at', { ascending: true }),
      supabase.from('importer_requests').select('id, company_name, email, status, created_at'),
    ]);
    if (subs.error) toast({ title: 'Chargement des soumissions impossible', description: subs.error.message, variant: 'destructive' });
    const ex = (existing.data ?? []) as Existing[];
    setRows(((subs.data ?? []) as unknown as Submission[]).map(s => {
      const mail = s.email.trim().toLowerCase();
      const comp = normalizeCompany(s.company_name);
      return { ...s, duplicates: ex.filter(e => (e.email && e.email.trim().toLowerCase() === mail) || (comp && normalizeCompany(e.company_name) === comp)) };
    }));
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const review = async (s: Row, status: 'published' | 'rejected' | 'merged', publicId: string | null = null) => {
    const { error } = await supabase.from('importer_opportunity_submissions')
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user?.id ?? null, public_opportunity_id: publicId })
      .eq('id', s.id).eq('status', 'pending');
    return error;
  };

  const publish = async (s: Row) => {
    if (busy) return;
    if (s.duplicates.length && !confirmDup.has(s.id)) { setConfirmDup(p => new Set(p).add(s.id)); return; }
    setBusy(s.id);
    try {
      const { data, error } = await supabase.from('importer_requests').insert(buildPublication(s)).select('id').single();
      if (error) throw error;
      const upd = await review(s, 'published', data.id);
      if (upd) throw new Error(`Demande publiée (${data.id}) mais statut de la soumission non mis à jour : ${upd.message}`);
      toast({ title: 'Demande publiée', description: s.company_name });
      onPublished?.();
      await load();
    } catch (e) {
      toast({ title: 'Publication impossible', description: (e as Error).message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const close = async (s: Row, status: 'rejected' | 'merged') => {
    if (busy) return;
    const msg = status === 'rejected' ? `Rejeter la soumission de ${s.company_name} ? Rien ne sera publié.` : `Marquer la soumission de ${s.company_name} comme doublon / traitée ? Rien ne sera publié.`;
    if (!window.confirm(msg)) return;
    setBusy(s.id);
    const error = await review(s, status);
    setBusy(null);
    if (error) { toast({ title: 'Action impossible', description: error.message, variant: 'destructive' }); return; }
    toast({ title: status === 'rejected' ? 'Soumission rejetée' : 'Soumission marquée comme traitée' });
    await load();
  };

  const line = (label: string, value: string | null | undefined) => value ? (
    <div className="text-sm"><span className="text-muted-foreground">{label} : </span><span className="text-foreground whitespace-pre-line">{value}</span></div>
  ) : null;

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Soumissions importateurs — en attente ({loading ? '…' : rows.length})</CardTitle>
        <p className="text-sm text-muted-foreground">Formulaire public /submit-opportunity. Rien n'est publié sans action de votre part ; sans accord de contact direct, la publication utilise l'adresse relais et masque le nom, le téléphone et l'adresse d'échantillons.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune soumission en attente.</p>
        ) : rows.map(s => (
          <div key={s.id} className="rounded-lg border border-border p-4 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-base font-semibold">{s.company_name} <span className="font-normal text-muted-foreground">· {s.country}</span></div>
                <div className="text-sm text-muted-foreground">{s.full_name} · {s.email}{s.phone ? ` · ${s.phone}` : ''} · {format(new Date(s.created_at), 'd MMM yyyy HH:mm', { locale: fr })} · {s.locale.toUpperCase()}</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary">Publication : {s.consent_publish ? 'oui' : 'non'}</Badge>
                <Badge variant={s.consent_direct_contact ? 'default' : 'outline'}>Contact direct : {s.consent_direct_contact ? 'oui' : 'non (relais)'}</Badge>
              </div>
            </div>
            {line('Styles', s.wine_styles)}
            {line('Origines', s.origins)}
            {line('Volume', s.volume)}
            {line('Prix EXW', s.price_range)}
            {line('Description', s.requirements)}
            {line('Adresse échantillons (privée)', s.sample_address)}
            {s.duplicates.length > 0 && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm space-y-1">
                <div className="flex items-center gap-2 font-medium text-destructive"><AlertTriangle className="h-4 w-4" />Doublon possible ({s.duplicates.length}) — même e-mail ou même entreprise :</div>
                {s.duplicates.slice(0, 5).map(d => (
                  <div key={d.id} className="text-foreground">{d.company_name} · {d.email} · {d.status} · {format(new Date(d.created_at), 'd MMM yyyy', { locale: fr })}</div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" disabled={busy !== null} onClick={() => publish(s)} variant={confirmDup.has(s.id) ? 'destructive' : 'default'}>
                {busy === s.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                {confirmDup.has(s.id) ? 'Publier quand même (nouvelle demande)' : 'Publier'}
              </Button>
              <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => close(s, 'merged')}><Copy className="h-4 w-4 mr-1" />Doublon / traité</Button>
              <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => close(s, 'rejected')}><X className="h-4 w-4 mr-1" />Rejeter</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
