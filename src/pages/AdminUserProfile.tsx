import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowLeft, Copy, Download, FileJson, Package, ExternalLink, User, Grape,
  FileText, Image as ImageIcon, Megaphone, Wallet, Loader2,
} from 'lucide-react';

type AnyRow = Record<string, any>;

function Copyable({ value, className = '' }: { value: string | number | null | undefined; className?: string }) {
  const { toast } = useToast();
  const text = value == null || value === '' ? '—' : String(value);
  if (text === '—') return <span className={`text-muted-foreground ${className}`}>—</span>;
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        toast({ title: 'Copié', description: text.slice(0, 80) });
      }}
      className={`group inline-flex items-center gap-1.5 text-left hover:text-foreground transition-colors ${className}`}
      title="Cliquer pour copier"
    >
      <span className="break-all">{text}</span>
      <Copy className="h-3 w-3 opacity-0 group-hover:opacity-60 flex-shrink-0" />
    </button>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  let display: any = value;
  if (Array.isArray(value)) display = value.length ? value.join(', ') : null;
  else if (typeof value === 'boolean') display = value ? 'Oui' : 'Non';
  else if (value && typeof value === 'object') display = JSON.stringify(value);
  return (
    <div className="space-y-1 min-w-0">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm"><Copyable value={display} /></div>
    </div>
  );
}

export default function AdminUserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [zipping, setZipping] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<AnyRow | null>(null);
  const [wines, setWines] = useState<AnyRow[]>([]);
  const [documents, setDocuments] = useState<AnyRow[]>([]);
  const [media, setMedia] = useState<AnyRow[]>([]);
  const [campaigns, setCampaigns] = useState<AnyRow[]>([]);
  const [leadsSummary, setLeadsSummary] = useState<Record<string, number>>({});
  const [credits, setCredits] = useState<AnyRow | null>(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const [
        profileRes, wineRes, docRes, mediaRes, campRes, leadRes, creditsRes,
        roleRes, settingsRes, emailsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('wines').select('*').eq('user_id', userId).order('name'),
        supabase.from('documents').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('media').select('*').eq('user_id', userId).order('sort_index'),
        supabase.from('campaigns').select('id,name,status,created_at,launched_at,markets,target_markets,audience_estimate,stats_opens,stats_clicks,stats_replies').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('leads').select('status, campaign_id, campaigns!inner(user_id)').eq('campaigns.user_id', userId),
        supabase.from('user_credits').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
        supabase.from('user_settings').select('display_name').eq('user_id', userId).maybeSingle(),
        supabase.rpc('get_users_emails_for_admin'),
      ]);

      setProfile(profileRes.data || null);
      setWines(wineRes.data || []);
      setDocuments(docRes.data || []);
      setMedia(mediaRes.data || []);
      setCampaigns(campRes.data || []);
      setCredits(creditsRes.data || null);
      setRole((roleRes.data as any)?.role ?? null);
      setDisplayName((settingsRes.data as any)?.display_name ?? null);
      const emailRow = (emailsRes.data as any[] | null)?.find((e) => e.user_id === userId);
      setEmail(emailRow?.email ?? null);

      const summary: Record<string, number> = {};
      (leadRes.data || []).forEach((l: any) => {
        const s = l.status || 'unknown';
        summary[s] = (summary[s] || 0) + 1;
      });
      setLeadsSummary(summary);

      setLoading(false);
    })();
  }, [userId]);

  const exportJson = () => {
    const payload = {
      exported_at: new Date().toISOString(),
      user: { user_id: userId, email, display_name: displayName, role },
      profile,
      wines,
      documents,
      media,
      campaigns,
      leads_summary: leadsSummary,
      credits,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-${displayName || userId}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export JSON', description: 'Téléchargement lancé' });
  };

  const downloadZip = async () => {
    if (!userId) return;
    setZipping(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-export-user-zip', {
        body: { user_id: userId },
      });
      if (error) throw error;
      // edge function returns base64 zip payload
      const blob = data instanceof Blob
        ? data
        : new Blob([Uint8Array.from(atob((data as any).zip_base64), (c) => c.charCodeAt(0))], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documents-${displayName || userId}-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'ZIP prêt', description: 'Téléchargement lancé' });
    } catch (e: any) {
      toast({ title: 'Erreur ZIP', description: e.message || String(e), variant: 'destructive' });
    } finally {
      setZipping(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-7xl py-12 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const extractDocPath = (fileUrl: string): string | null => {
    if (!fileUrl) return null;
    const marker = '/documents/';
    const idx = fileUrl.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(fileUrl.slice(idx + marker.length).split('?')[0]);
  };

  const getSignedDocUrl = async (fileUrl: string): Promise<string | null> => {
    const path = extractDocPath(fileUrl);
    if (!path) return null;
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  };

  const handleDocDownload = async (fileUrl: string) => {
    const signed = await getSignedDocUrl(fileUrl);
    if (!signed) {
      toast({ title: 'Erreur', description: 'Impossible de générer le lien', variant: 'destructive' });
      return;
    }
    window.open(signed, '_blank', 'noopener');
  };

  const handleDocCopy = async (fileUrl: string) => {
    const signed = await getSignedDocUrl(fileUrl);
    if (!signed) {
      toast({ title: 'Erreur', description: 'Impossible de générer le lien', variant: 'destructive' });
      return;
    }
    await navigator.clipboard.writeText(signed);
    toast({ title: 'Lien copié', description: 'Valide 1h' });
  };

  const fmtBytes = (n?: number | null) => {
    if (!n) return '—';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="container max-w-7xl py-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <User className="h-6 w-6" />
              {displayName || profile?.domain_name || email || 'Utilisateur'}
            </h1>
            <div className="mt-1 flex items-center flex-wrap gap-2 text-sm text-muted-foreground">
              <Copyable value={email} />
              {role && <Badge variant="secondary">{role}</Badge>}
              {profile?.subscription_plan && profile.subscription_plan !== 'none' && (
                <Badge>{profile.subscription_plan}</Badge>
              )}
              <span className="text-xs font-mono">
                <Copyable value={userId} />
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportJson}>
            <FileJson className="h-4 w-4 mr-2" /> Export JSON
          </Button>
          <Button onClick={downloadZip} disabled={zipping || (documents.length === 0 && media.length === 0)}>
            {zipping ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Package className="h-4 w-4 mr-2" />}
            ZIP documents & médias
          </Button>
        </div>
      </div>

      <Tabs defaultValue="domain">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="domain"><User className="h-3.5 w-3.5 mr-1.5" />Domaine</TabsTrigger>
          <TabsTrigger value="wines"><Grape className="h-3.5 w-3.5 mr-1.5" />Cuvées ({wines.length})</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="h-3.5 w-3.5 mr-1.5" />Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="media"><ImageIcon className="h-3.5 w-3.5 mr-1.5" />Médias ({media.length})</TabsTrigger>
          <TabsTrigger value="campaigns"><Megaphone className="h-3.5 w-3.5 mr-1.5" />Campagnes ({campaigns.length})</TabsTrigger>
          <TabsTrigger value="crm"><Wallet className="h-3.5 w-3.5 mr-1.5" />CRM & crédits</TabsTrigger>
        </TabsList>

        {/* DOMAINE */}
        <TabsContent value="domain" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Profil domaine</CardTitle></CardHeader>
            <CardContent>
              {!profile ? (
                <p className="text-sm text-muted-foreground">Aucun profil rempli.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                  <Field label="Domaine" value={profile.domain_name} />
                  <Field label="Contact" value={profile.contact_name} />
                  <Field label="Localisation" value={profile.location} />
                  <Field label="AOC" value={profile.aoc} />
                  <Field label="Site web" value={profile.website} />
                  <Field label="Vidéo en ligne" value={profile.online_video_url} />
                  <Field label="Surface (ha)" value={profile.surface_area} />
                  <Field label="Bouteilles / an" value={profile.bottles_per_year} />
                  <Field label="Couleurs" value={profile.wine_colors} />
                  <Field label="Types de vin" value={profile.wine_types} />
                  <Field label="Cépages" value={profile.grape_varieties} />
                  <Field label="Cuvées (legacy)" value={profile.cuvees} />
                  <Field label="Certifications" value={profile.certifications} />
                  <Field label="Conversion bio" value={profile.organic_conversion} />
                  <Field label="Organisme bio" value={profile.organic_body} />
                  <Field label="Année conversion" value={profile.organic_year} />
                  <Field label="Marchés actuels" value={profile.current_markets} />
                  <Field label="Marchés prioritaires" value={profile.priority_markets} />
                  <Field label="Marchés à éviter" value={profile.avoid_markets} />
                  <Field label="Acheteur cible" value={profile.target_buyer_description} />
                  <Field label="Points forts" value={profile.strengths} />
                  <Field label="Réseaux sociaux" value={profile.social_media} />
                  <Field label="Plan" value={profile.subscription_plan} />
                  <Field label="Stripe customer" value={profile.stripe_customer_id} />
                  <Field label="Profil publié" value={profile.is_published} />
                  <Field label="Onboarding terminé" value={profile.onboarding_completed} />
                  <div className="md:col-span-2 lg:col-span-3">
                    <Field label="Description" value={profile.description} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CUVÉES */}
        <TabsContent value="wines" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {wines.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">Aucune cuvée.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Couleur</TableHead>
                      <TableHead>Appellation</TableHead>
                      <TableHead>Cépages</TableHead>
                      <TableHead>Millésimes</TableHead>
                      <TableHead>Prix EXW</TableHead>
                      <TableHead>Labels</TableHead>
                      <TableHead>Récompenses</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wines.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell><Copyable value={w.name} /></TableCell>
                        <TableCell>{w.color || '—'}</TableCell>
                        <TableCell><Copyable value={w.appellation} /></TableCell>
                        <TableCell className="text-xs">{(w.grapes || []).join(', ') || '—'}</TableCell>
                        <TableCell className="text-xs">{(w.vintages || []).join(', ') || '—'}</TableCell>
                        <TableCell>{w.exw_price_eur != null ? `${w.exw_price_eur} €` : '—'}</TableCell>
                        <TableCell className="text-xs space-x-1">
                          {w.organic && <Badge variant="secondary">Bio</Badge>}
                          {w.is_biodynamic && <Badge variant="secondary">Biodyn.</Badge>}
                          {w.is_natural && <Badge variant="secondary">Nature</Badge>}
                        </TableCell>
                        <TableCell className="text-xs"><Copyable value={w.awards} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOCUMENTS */}
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {documents.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">Aucun document.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Cuvée</TableHead>
                      <TableHead>Langue</TableHead>
                      <TableHead>Taille</TableHead>
                      <TableHead>Ajouté</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="max-w-[260px] truncate"><Copyable value={d.title || d.file_name} /></TableCell>
                        <TableCell><Badge variant="outline">{d.category || '—'}</Badge></TableCell>
                        <TableCell className="text-xs">{d.cuvee || '—'}</TableCell>
                        <TableCell className="text-xs">{d.language || '—'}</TableCell>
                        <TableCell className="text-xs">{fmtBytes(d.file_size)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(d.created_at).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="sm" variant="ghost" asChild>
                            <a href={d.file_url} target="_blank" rel="noreferrer" download={d.file_name}>
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { navigator.clipboard.writeText(d.file_url); toast({ title: 'Lien copié' }); }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MÉDIAS */}
        <TabsContent value="media" className="mt-4">
          <Card>
            <CardContent className="p-4">
              {media.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun média.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {media.map((m) => (
                    <div key={m.id} className="border rounded-lg overflow-hidden bg-muted/30">
                      <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                        {m.type === 'image' ? (
                          <img src={m.file_url} alt={m.title || ''} className="w-full h-full object-cover" loading="lazy" />
                        ) : m.type === 'video' ? (
                          <video src={m.file_url} className="w-full h-full object-cover" controls preload="metadata" />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="p-2 space-y-1">
                        <div className="text-xs font-medium truncate" title={m.title || ''}>{m.title || '—'}</div>
                        <div className="flex items-center justify-between gap-1">
                          <Badge variant="outline" className="text-[10px]">{m.type}</Badge>
                          <div className="flex gap-0.5">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" asChild>
                              <a href={m.file_url} target="_blank" rel="noreferrer" download>
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                            <Button
                              size="sm" variant="ghost" className="h-7 w-7 p-0"
                              onClick={() => { navigator.clipboard.writeText(m.file_url); toast({ title: 'Lien copié' }); }}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CAMPAGNES */}
        <TabsContent value="campaigns" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {campaigns.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">Aucune campagne.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Marchés</TableHead>
                      <TableHead>Cible</TableHead>
                      <TableHead>Ouvertures</TableHead>
                      <TableHead>Clics</TableHead>
                      <TableHead>Réponses</TableHead>
                      <TableHead>Créée</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell><Copyable value={c.name} /></TableCell>
                        <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                        <TableCell className="text-xs">{(c.markets || c.target_markets || []).join(', ') || '—'}</TableCell>
                        <TableCell>{c.audience_estimate ?? '—'}</TableCell>
                        <TableCell>{c.stats_opens ?? 0}</TableCell>
                        <TableCell>{c.stats_clicks ?? 0}</TableCell>
                        <TableCell>{c.stats_replies ?? 0}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString('fr-FR')}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/campaigns?campaign=${c.id}`)}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CRM & CRÉDITS */}
        <TabsContent value="crm" className="mt-4 grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Leads par statut</CardTitle></CardHeader>
            <CardContent>
              {Object.keys(leadsSummary).length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun lead.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(leadsSummary).map(([s, n]) => (
                    <div key={s} className="flex items-center justify-between text-sm">
                      <Badge variant="outline">{s}</Badge>
                      <span className="font-medium">{n}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Crédits & abonnement</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label="Crédits campagnes" value={credits?.campaign_credits ?? 0} />
              <Field label="Crédits recherche" value={credits?.search_credits ?? 0} />
              <Field label="Début abonnement" value={credits?.subscription_start_date} />
              <Field label="Prochain reset" value={credits?.next_reset_date} />
              <Field label="Plan" value={profile?.subscription_plan} />
              <Field label="Stripe customer ID" value={profile?.stripe_customer_id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}