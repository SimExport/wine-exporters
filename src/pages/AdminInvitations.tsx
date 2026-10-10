import { useEffect, useState, useCallback } from "react";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, UserPlus, CheckCircle2, XCircle, History, Send, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ExportVinsInviteForm from "@/components/admin/ExportVinsInviteForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type InvitationRow = {
  id: string;
  email: string;
  status: "sent" | "failed" | "pending";
  invitation_type?: string;
  domain_name?: string | null;
  mission_name?: string | null;
  imported_count?: number | null;
  error_message: string | null;
  invited_user_id: string | null;
  created_at: string;
};

const emailSchema = z.string().trim().email().max(255);

const AdminInvitations = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<InvitationRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [inviteType, setInviteType] = useState<"classic" | "exportvins">("classic");
  const [ents, setEnts] = useState<Record<string, any>>({});

  const buildRedirect = () => {
    const PROD_ORIGIN = "https://wine-exporters.com";
    const currentOrigin = window.location.origin;
    const isProdHost =
      currentOrigin === PROD_ORIGIN ||
      currentOrigin === "https://wine-exporters.lovable.app";
    return `${isProdHost ? currentOrigin : PROD_ORIGIN}/set-password`;
  };

  const onCopyLink = async (row: InvitationRow) => {
    setLinkingId(row.id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-invite-link", {
        body: { email: row.email, redirectTo: buildRedirect() },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const link = (data as any)?.link as string;
      await navigator.clipboard.writeText(link);
      toast({
        title: "Lien copié",
        description: `Lien de création de mot de passe copié pour ${row.email}. Transmettez-le directement.`,
      });
    } catch (err: any) {
      toast({
        title: t("adminInvitations.errorTitle"),
        description: err?.message || t("adminInvitations.errorGeneric"),
        variant: "destructive",
      });
    } finally {
      setLinkingId(null);
    }
  };

  const sendInvite = async (target: string, mode?: "resend") => {
    const redirectTo = buildRedirect();
    const { data, error } = await supabase.functions.invoke("admin-invite-user", {
      body: { email: target, redirectTo, mode },
    });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
  };

  const onResend = async (row: InvitationRow) => {
    setResendingId(row.id);
    try {
      await sendInvite(row.email, "resend");
      toast({ title: t("adminInvitations.successTitle"), description: t("adminInvitations.successDesc", { email: row.email }) });
      loadRows();
    } catch (err: any) {
      toast({ title: t("adminInvitations.errorTitle"), description: err?.message || t("adminInvitations.errorGeneric"), variant: "destructive" });
      loadRows();
    } finally {
      setResendingId(null);
    }
  };

  const loadRows = useCallback(async () => {
    setLoadingRows(true);
    const { data, error } = await supabase
      .from("admin_invitations")
      .select("id,email,status,error_message,invited_user_id,created_at,invitation_type,domain_name,mission_name,imported_count")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error && data) {
      setRows(data as InvitationRow[]);
      const ids = (data as any[]).filter((r) => r.invitation_type === "exportvins" && r.invited_user_id).map((r) => r.invited_user_id);
      if (ids.length) {
        const { data: e } = await (supabase.from as any)("user_entitlements")
          .select("user_id,status,activated_at,expires_at,grace_ends_at").in("user_id", ids);
        setEnts(Object.fromEntries((e || []).map((x: any) => [x.user_id, x])));
      }
    }
    setLoadingRows(false);
  }, []);

  useEffect(() => { loadRows(); }, [loadRows]);

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast({ title: t("adminInvitations.errorTitle"), description: t("adminInvitations.invalidEmail"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await sendInvite(parsed.data);
      toast({ title: t("adminInvitations.successTitle"), description: t("adminInvitations.successDesc", { email: parsed.data }) });
      setEmail("");
      loadRows();
    } catch (err: any) {
      toast({ title: t("adminInvitations.errorTitle"), description: err?.message || t("adminInvitations.errorGeneric"), variant: "destructive" });
      loadRows();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("adminInvitations.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("adminInvitations.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t("adminInvitations.formTitle")}
          </CardTitle>
          <CardDescription>{t("adminInvitations.formDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {([["classic","Invitation classique WineExporters"],["exportvins","Client ExportVins — Mission Performance"]] as const).map(([v,l]) => (
              <button key={v} type="button" onClick={() => setInviteType(v)}
                className={`rounded-md border px-3 py-2 text-sm text-left ${inviteType===v ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground"}`}>{l}</button>
            ))}
          </div>
          {inviteType === "exportvins" ? (
            <ExportVinsInviteForm buildRedirect={buildRedirect} onDone={loadRows} />
          ) : (
          <form onSubmit={onInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">{t("adminInvitations.emailLabel")}</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="contact@domaine.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                maxLength={255}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              <Mail className="h-4 w-4 mr-2" />
              {loading ? t("adminInvitations.sending") : t("adminInvitations.send")}
            </Button>
          </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Journal d'invitations
          </CardTitle>
          <CardDescription>Les 50 dernières invitations envoyées.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRows ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune invitation pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.email}</TableCell>
                      <TableCell className="text-xs">
                        {r.invitation_type === "exportvins" ? (() => {
                          const e = r.invited_user_id ? ents[r.invited_user_id] : null;
                          const now = Date.now();
                          const st = !e ? "Abonné / sans essai" : e.status === "invited" ? "En attente de connexion"
                            : e.status === "converted" ? "Abonné"
                            : new Date(e.expires_at).getTime() > now ? "Essai actif"
                            : new Date(e.grace_ends_at).getTime() > now ? "Lecture seule" : "Expiré";
                          const d = (x?: string) => x ? new Date(x).toLocaleDateString("fr-FR") : "—";
                          return (<div className="space-y-0.5">
                            <Badge variant="outline">ExportVins</Badge>
                            <div>{r.domain_name} · {r.mission_name}</div>
                            <div className="text-muted-foreground">{st}{r.imported_count != null ? ` · ${r.imported_count} contacts` : ""}</div>
                            {e?.activated_at && <div className="text-muted-foreground">{d(e.activated_at)} → {d(e.expires_at)}</div>}
                          </div>);
                        })() : <span className="text-muted-foreground">Classique</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(r.created_at).toLocaleString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        {r.status === "sent" ? (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Envoyée
                          </Badge>
                        ) : r.status === "pending" ? (
                          <Badge variant="outline">En préparation</Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1" title={r.error_message ?? undefined}>
                            <XCircle className="h-3 w-3" /> Échouée
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {r.invited_user_id ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onCopyLink(r)}
                          disabled={linkingId === r.id}
                          title="Copier le lien de création de mot de passe"
                        >
                          <Link2 className="h-3 w-3 mr-1" />
                          {linkingId === r.id ? "…" : "Lien"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onResend(r)}
                          disabled={resendingId === r.id}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          {resendingId === r.id ? "Envoi…" : "Renvoyer"}
                        </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInvitations;