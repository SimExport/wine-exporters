import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Users, Search, Copy } from 'lucide-react';

type AppRole = 'admin' | 'user' | 'free' | 'paid';

interface UserRow {
  user_id: string;
  display_name: string | null;
  domain_name: string | null;
  role: AppRole | null;
  subscription_plan: string | null;
  stripe_customer_id: string | null;
  created_at: string;
}

const ROLE_OPTIONS: AppRole[] = ['admin', 'paid', 'free', 'user'];
const PLAN_OPTIONS = ['none', 'paid'];

function isInconsistent(role: AppRole | null, plan: string | null): boolean {
  if (role === 'admin') return false;
  const hasPaidPlan = plan && plan !== 'none';
  const hasPaidRole = role === 'paid';
  return Boolean(hasPaidPlan) !== Boolean(hasPaidRole);
}

export default function AdminUsers() {
  const { toast } = useToast();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'inconsistent'>('all');
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [profilesRes, rolesRes, settingsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('user_id, domain_name, subscription_plan, stripe_customer_id, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('user_settings').select('user_id, display_name'),
    ]);

    if (profilesRes.error) {
      toast({ title: 'Erreur', description: profilesRes.error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    const rolesMap = new Map<string, AppRole>();
    (rolesRes.data || []).forEach((r: any) => rolesMap.set(r.user_id, r.role));
    const settingsMap = new Map<string, string | null>();
    (settingsRes.data || []).forEach((s: any) => settingsMap.set(s.user_id, s.display_name));

    const merged: UserRow[] = (profilesRes.data || []).map((p: any) => ({
      user_id: p.user_id,
      domain_name: p.domain_name,
      subscription_plan: p.subscription_plan,
      stripe_customer_id: p.stripe_customer_id,
      created_at: p.created_at,
      role: rolesMap.get(p.user_id) ?? null,
      display_name: settingsMap.get(p.user_id) ?? null,
    }));

    setRows(merged);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === 'inconsistent' && !isInconsistent(r.role, r.subscription_plan)) return false;
      if (!q) return true;
      return (
        (r.display_name || '').toLowerCase().includes(q) ||
        (r.domain_name || '').toLowerCase().includes(q) ||
        r.user_id.toLowerCase().includes(q)
      );
    });
  }, [rows, search, filter]);

  const inconsistentCount = useMemo(
    () => rows.filter((r) => isInconsistent(r.role, r.subscription_plan)).length,
    [rows]
  );

  const updateRole = async (row: UserRow, newRole: AppRole) => {
    if (newRole === row.role) return;
    setSavingId(row.user_id);
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', row.user_id);
    setSavingId(null);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    setRows((prev) => prev.map((r) => (r.user_id === row.user_id ? { ...r, role: newRole } : r)));
    toast({ title: 'Rôle mis à jour', description: `${row.display_name || row.user_id} → ${newRole}` });
  };

  const updatePlan = async (row: UserRow, newPlan: string) => {
    if (newPlan === (row.subscription_plan || 'none')) return;
    setSavingId(row.user_id);
    const { error } = await supabase
      .from('profiles')
      .update({ subscription_plan: newPlan })
      .eq('user_id', row.user_id);
    setSavingId(null);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    setRows((prev) =>
      prev.map((r) => (r.user_id === row.user_id ? { ...r, subscription_plan: newPlan } : r))
    );
    toast({ title: 'Plan mis à jour', description: `${row.display_name || row.user_id} → ${newPlan}` });
  };

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({ title: 'Copié', description: id });
  };

  return (
    <div className="container max-w-7xl py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7" />
            Utilisateurs
          </h1>
          <p className="text-muted-foreground mt-1">
            Rôle, plan d'abonnement et détection des incohérences.
          </p>
        </div>
        {inconsistentCount > 0 && (
          <Badge variant="destructive" className="gap-1 text-sm py-1.5 px-3">
            <AlertTriangle className="h-3.5 w-3.5" />
            {inconsistentCount} incohérence{inconsistentCount > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtres</CardTitle>
          <CardDescription>
            Une incohérence = rôle <code className="text-xs">paid</code> sans plan, ou plan{' '}
            <code className="text-xs">paid</code> sans rôle correspondant.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nom, domaine ou user_id…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les utilisateurs</SelectItem>
              <SelectItem value="inconsistent">Incohérences uniquement</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load} disabled={loading}>
            Rafraîchir
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Aucun utilisateur.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Domaine</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Stripe</TableHead>
                    <TableHead>Inscrit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => {
                    const bad = isInconsistent(row.role, row.subscription_plan);
                    return (
                      <TableRow key={row.user_id} className={bad ? 'bg-destructive/5' : ''}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium flex items-center gap-2">
                              {bad && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                              {row.display_name || '—'}
                            </span>
                            <button
                              onClick={() => copyId(row.user_id)}
                              className="text-[10px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 group"
                              title="Copier l'ID"
                            >
                              {row.user_id.slice(0, 8)}…
                              <Copy className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{row.domain_name || '—'}</TableCell>
                        <TableCell>
                          <Select
                            value={row.role || 'user'}
                            onValueChange={(v) => updateRole(row, v as AppRole)}
                            disabled={savingId === row.user_id}
                          >
                            <SelectTrigger className="w-[110px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLE_OPTIONS.map((r) => (
                                <SelectItem key={r} value={r}>
                                  {r}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.subscription_plan || 'none'}
                            onValueChange={(v) => updatePlan(row, v)}
                            disabled={savingId === row.user_id}
                          >
                            <SelectTrigger className="w-[110px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PLAN_OPTIONS.map((p) => (
                                <SelectItem key={p} value={p}>
                                  {p}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {row.stripe_customer_id ? (
                            <Badge variant="secondary" className="font-mono text-[10px]">
                              {row.stripe_customer_id.slice(0, 12)}…
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(row.created_at).toLocaleDateString('fr-FR')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}