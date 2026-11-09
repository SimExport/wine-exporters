import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, AlertTriangle, Activity, CheckCircle2, Mail } from 'lucide-react';

interface Incident {
  id: string; category: string; severity: 'warning' | 'blocking'; human_title: string; human_message: string;
  technical_message: string | null; resource_type: string | null; resource_id: string | null; status: 'open' | 'resolved';
  first_seen_at: string; last_seen_at: string; resolved_at: string | null; occurrences: number; alert_state: string;
}

const fmt = (iso: string | null) => iso ? new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : '—';
const ALERT_LABEL: Record<string, string> = { none: '—', pending: 'En attente', sending: 'Envoi en cours', sent: 'Envoyée', failed: 'Échec, nouvel essai', uncertain: 'Incertaine (pas de renvoi)' };

export default function AdminSystemHealth() {
  const [rows, setRows] = useState<Incident[]>([]);
  const [stats, setStats] = useState({ open: 0, week: 0, resolved: 0 });
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(false);
      const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
      let list = supabase.from('system_incidents' as never).select('id,category,severity,human_title,human_message,technical_message,resource_type,resource_id,status,first_seen_at,last_seen_at,resolved_at,occurrences,alert_state').order('last_seen_at', { ascending: false }).limit(20);
      if (filter === 'open') list = list.eq('status', 'open');
      const head = { count: 'exact' as const, head: true };
      const [l, o, w, r] = await Promise.all([
        list,
        supabase.from('system_incidents' as never).select('id', head).eq('status', 'open').eq('severity', 'blocking'),
        supabase.from('system_incidents' as never).select('id', head).gte('first_seen_at', weekAgo),
        supabase.from('system_incidents' as never).select('id', head).eq('status', 'resolved'),
      ]);
      if (cancelled) return;
      if (l.error || o.error || w.error || r.error) { setError(true); setLoading(false); return; }
      setRows((l.data ?? []) as unknown as Incident[]);
      setStats({ open: o.count ?? 0, week: w.count ?? 0, resolved: r.count ?? 0 });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [filter]);

  const kpis = useMemo(() => [
    { label: 'Blocages en cours', value: stats.open, icon: AlertTriangle, tone: stats.open ? 'text-destructive' : 'text-muted-foreground' },
    { label: 'Incidents 7 derniers jours', value: stats.week, icon: Activity, tone: 'text-primary' },
    { label: 'Résolus', value: stats.resolved, icon: CheckCircle2, tone: 'text-primary' },
  ], [stats]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Santé du système</h1>
        <p className="text-sm text-muted-foreground">Surveillance automatique des envois de campagnes, des résultats J+2 et des emails automatiques.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.label}><CardContent className="flex items-center justify-between p-5">
            <div><p className="text-sm text-muted-foreground">{k.label}</p><p className="text-3xl font-semibold">{loading ? '…' : k.value}</p></div>
            <k.icon className={`h-8 w-8 ${k.tone}`} />
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">20 dernières entrées</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant={filter === 'open' ? 'default' : 'outline'} onClick={() => setFilter('open')}>Ouverts</Button>
            <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>Tous</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          : error ? <p className="py-8 text-center text-sm text-destructive">Impossible de charger les incidents pour le moment.</p>
          : rows.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{filter === 'open' ? 'Aucun incident en cours. Tout fonctionne normalement.' : 'Aucun incident enregistré.'}</p>
          : <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Domaine / service</TableHead><TableHead className="min-w-[320px]">Message</TableHead><TableHead>État</TableHead><TableHead>Dernière détection</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} className="align-top">
                    <TableCell className="whitespace-nowrap text-sm">{fmt(r.first_seen_at)}</TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{r.category}</div>
                      <Badge variant={r.severity === 'blocking' ? 'destructive' : 'secondary'} className="mt-1">{r.severity === 'blocking' ? 'Bloquant' : 'Avertissement'}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{r.human_title}</div>
                      <p className="text-muted-foreground">{r.human_message}</p>
                      {r.resource_type === 'campaign' && r.resource_id && <Link to={`/campaigns/${r.resource_id}`} className="text-primary underline text-xs">Voir la campagne</Link>}
                      {r.technical_message && <Accordion type="single" collapsible><AccordionItem value="t" className="border-none">
                        <AccordionTrigger className="py-1 text-xs text-muted-foreground">Détails techniques</AccordionTrigger>
                        <AccordionContent className="text-xs text-muted-foreground break-words">{r.technical_message}<br />Détections : {r.occurrences} · Alerte email : {ALERT_LABEL[r.alert_state] ?? r.alert_state}</AccordionContent>
                      </AccordionItem></Accordion>}
                    </TableCell>
                    <TableCell>{r.status === 'open' ? <Badge variant="destructive">En cours</Badge> : <Badge variant="outline">Résolu {r.resolved_at ? `le ${fmt(r.resolved_at)}` : ''}</Badge>}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{fmt(r.last_seen_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></div>}
        </CardContent>
      </Card>

      <Card><CardContent className="flex gap-3 p-5 text-sm text-muted-foreground">
        <Mail className="h-5 w-5 shrink-0 text-primary" />
        <p>Une vérification automatique a lieu toutes les 10 minutes. Seuls les <strong>blocages</strong> déclenchent un email à simon@exportvins.fr : un email à l'ouverture, puis un email quand le problème est réellement terminé (campagne envoyée ou résultats publiés). Un même incident détecté plusieurs fois ne crée ni nouvelle ligne ni nouvel email. Les avertissements restent visibles ici, sans email. Un incident se ferme tout seul : il n'y a pas de bouton « résolu » pour éviter de masquer un vrai problème.</p>
      </CardContent></Card>
    </div>
  );
}
