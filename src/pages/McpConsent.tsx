import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const BROKER = "https://dmgafmigqfycyaopdviw.supabase.co/functions/v1/wineexporters-oauth-broker";
const RESOURCE = "https://dmgafmigqfycyaopdviw.supabase.co/functions/v1/wineexporters-mcp-isolated";
const STORAGE = "wineexporters.mcp.pending.v1";
const labels: Record<string,string> = {
  "wineexporters:account": "Consulter votre profil de domaine et le solde de vos crédits",
  "wineexporters:importers": "Rechercher et consulter les importateurs selon vos crédits disponibles",
  "wineexporters:crm:read": "Consulter vos prospects et leur historique",
  "wineexporters:crm:write": "Ajouter des prospects, enregistrer vos échanges et vos relances après validation",
};
type Details = { client_name: string; resource: string; scopes: string[] };
type Grant = { grant_id: string; client_name: string; scopes: string[]; created_at: string };
const requestPattern = /^[A-Za-z0-9_-]{43}$/;
const genericError = "Cette connexion n'est pas disponible ou a expiré. Recommencez depuis votre assistant IA.";

function rememberRequest(): string | null {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const incoming = fragment.getAll("request");
  if (incoming.length) {
    if (incoming.length !== 1 || !requestPattern.test(incoming[0])) return null;
    sessionStorage.setItem(STORAGE, JSON.stringify({ id: incoming[0], at: Date.now() }));
    // Keep the request out of URLs and navigation history. No OAuth token is stored here.
    window.history.replaceState(window.history.state, "", "/mcp/consent");
    return incoming[0];
  }
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE) || "null");
    if (saved && requestPattern.test(saved.id) && Number.isFinite(saved.at)
      && saved.at <= Date.now() && Date.now() - saved.at < 300000) return saved.id;
  } catch { /* invalid session storage */ }
  sessionStorage.removeItem(STORAGE);
  return null;
}
async function post(path: "details" | "connections" | "disconnect", fields: Record<string,string>, token?: string, signal?: AbortSignal) {
  const res = await fetch(BROKER + "/" + path, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: new URLSearchParams(fields), credentials: "omit", redirect: "error", cache: "no-store",
    referrerPolicy: "no-referrer", signal,
  });
  if (!res.ok) throw new Error(genericError);
  return res.json();
}
function Screen({children, title, description}: {children: React.ReactNode; title: string; description: string}) {
  return <main className="min-h-screen flex items-center justify-center bg-background p-4">
    <Card className="w-full max-w-lg">
      <CardHeader><div className="flex justify-center mb-4"><BrandLogo className="h-16 w-auto max-w-[300px]" /></div>
        <CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription>
      </CardHeader><CardContent className="space-y-4">{children}</CardContent>
    </Card></main>;
}
export default function McpConsent() {
  const { user, loading } = useAuth();
  const [request, setRequest] = useState<string | null>(null);
  const [details, setDetails] = useState<Details | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    try {
      const id = rememberRequest();
      if (!id) setError(genericError);
      else setRequest(id);
    } catch { setError(genericError); }
  }, []);
  useEffect(() => {
    if (!request || loading) return;
    if (!user) { window.location.replace("/auth?next=" + encodeURIComponent("/mcp/consent")); return; }
    const controller = new AbortController();
    post("details", {request}, undefined, controller.signal).then((d: Details) => {
      if (!d || typeof d.client_name !== "string" || d.resource !== RESOURCE || !Array.isArray(d.scopes)
        || !d.scopes.length || d.scopes.some(scope => !Object.prototype.hasOwnProperty.call(labels, scope))) throw new Error(genericError);
      setDetails(d);
    }).catch(() => { if (!controller.signal.aborted) setError(genericError); });
    return () => controller.abort();
  }, [request, user, loading]);
  async function decide(approve: boolean) {
    if (!request || !details || busy) return;
    setBusy(true); setError("");
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (approve && (sessionError || !data.session || data.session.user.id !== user?.id)) throw new Error(genericError);
      // A top-level POST preserves the broker's HttpOnly browser-binding cookie.
      // The website token is sent only to the fixed HTTPS broker, never to the AI client.
      const form = document.createElement("form");
      form.method = "POST"; form.action = BROKER + "/decision"; form.target = "_self";
      const fields: Record<string,string> = { request, approve: approve ? "yes" : "no" };
      if (approve && data.session) fields.access_token = data.session.access_token;
      for (const [name,value] of Object.entries(fields)) {
        const input = document.createElement("input"); input.type="hidden"; input.name=name; input.value=value; form.appendChild(input);
      }
      sessionStorage.removeItem(STORAGE);
      document.body.appendChild(form); form.submit();
    } catch { setError(genericError); setBusy(false); }
  }
  return <Screen title="Autoriser une connexion IA" description="Vous restez maître de votre compte WineExporters. L'assistant ne reçoit pas votre accès Supabase.">
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!details && !error && <p className="text-sm text-muted-foreground">Vérification de la demande…</p>}
    {details && <>
      <p className="text-sm">Application : <strong>{details.client_name}</strong></p>
      <p className="text-sm">Compte : <strong>{user?.email}</strong></p>
      <ul className="list-disc pl-5 space-y-2 text-sm">{details.scopes.map(scope => <li key={scope}>{labels[scope]}</li>)}</ul>
      <p className="text-sm text-muted-foreground">Les crédits restent partagés avec WineExporters. Aucune campagne ni messagerie n'est accessible par cette connexion. Vous pouvez retirer votre autorisation.</p>
      <div className="flex gap-2"><Button className="flex-1" disabled={busy || !user} onClick={() => void decide(true)}>Autoriser</Button>
        <Button className="flex-1" variant="outline" disabled={busy} onClick={() => void decide(false)}>Refuser</Button></div>
    </>}
    <a className="text-sm underline" href="/mcp/connections">Gérer mes connexions IA</a>
  </Screen>;
}

export function McpConnections() {
  const { user, loading } = useAuth();
  const [grants,setGrants] = useState<Grant[] | null>(null);
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  async function token() {
    const {data,error} = await supabase.auth.getSession();
    if (error || !data.session || data.session.user.id !== user?.id) throw new Error(genericError);
    return data.session.access_token;
  }
  useEffect(() => {
    if (loading) return;
    if (!user) { window.location.replace("/auth?next=" + encodeURIComponent("/mcp/connections")); return; }
    const controller = new AbortController();
    token().then(t=>post("connections",{},t,controller.signal)).then((data: unknown)=>{
      if(!Array.isArray(data)) throw new Error(genericError);
      setGrants(data as Grant[]);
    }).catch(()=>{ if(!controller.signal.aborted)setError(genericError); });
    return ()=>controller.abort();
  }, [loading,user]);
  async function disconnect(id:string) {
    if (busy || !window.confirm("Retirer cette autorisation WineExporters ?")) return;
    setBusy(true);setError("");
    try { await post("disconnect",{grant_id:id},await token()); setGrants(previous=>(previous||[]).filter(g=>g.grant_id!==id)); }
    catch {setError(genericError);} finally {setBusy(false);}
  }
  return <Screen title="Connexions IA" description="Consultez ou retirez les autorisations accordées à vos assistants.">
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!error && grants===null && <p className="text-sm">Chargement…</p>}
    {grants?.length===0 && <p className="text-sm">Aucune autorisation active.</p>}
    {grants?.map(g=><div className="border rounded-md p-3 space-y-2" key={g.grant_id}>
      <p className="font-medium">{g.client_name}</p><p className="text-xs text-muted-foreground">{g.scopes.map(s=>labels[s]||s).join(" · ")}</p>
      <Button variant="outline" disabled={busy} onClick={()=>void disconnect(g.grant_id)}>Déconnecter</Button></div>)}
    <a href="/settings" className="text-sm underline">Retour aux paramètres</a>
  </Screen>;
}
