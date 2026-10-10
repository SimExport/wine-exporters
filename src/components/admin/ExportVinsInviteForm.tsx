import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Send, CheckCircle2, AlertTriangle } from "lucide-react";

type Contact = Record<string, string>;

const FIELD_ALIASES: Record<string, string[]> = {
  company_name: ["societe", "société", "company", "company_name", "entreprise", "nom de la societe", "raison sociale", "importateur", "importer"],
  country: ["pays", "country"],
  contact_name: ["contact", "contact principal", "contact_name", "nom", "name", "nom du contact"],
  email: ["email", "e-mail", "mail", "courriel"],
  phone: ["telephone", "téléphone", "phone", "tel", "tél"],
  website: ["site", "site web", "website", "url", "site internet"],
  address: ["adresse", "address"],
  cuvees: ["cuvees", "cuvées", "cuvees selectionnees", "cuvées sélectionnées", "wines", "vins"],
  comments: ["commentaires", "commentaire", "comments", "besoins", "notes", "remarques"],
  next_action: ["prochaine action", "next action", "next_action"],
  importer_description: ["description importateur", "description de l'importateur", "description", "importer description", "about", "about the importer", "a propos"],
  relevance_reason: ["pourquoi pertinent", "pourquoi cet importateur est pertinent", "pertinence", "why relevant", "relevance", "why this importer is relevant"],
};
const strip = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

function parseCsv(text: string): string[][] {
  text = text.replace(/^\uFEFF/, "");
  const first = text.split(/\r?\n/)[0] || "";
  const sep = (first.match(/;/g)?.length || 0) >= (first.match(/,/g)?.length || 0) ? ";" : ",";
  const rows: string[][] = []; let row: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false; else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); cur = ""; if (row.some((c) => c.trim())) rows.push(row); row = [];
    } else cur += ch;
  }
  row.push(cur); if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

function analyse(rows: string[][]) {
  const header = (rows[0] || []).map(strip);
  const map: Record<number, string> = {};
  header.forEach((h, i) => {
    for (const [f, al] of Object.entries(FIELD_ALIASES)) if (al.map(strip).includes(h) && !Object.values(map).includes(f)) map[i] = f;
  });
  const valid: Contact[] = []; const errors: string[] = []; let duplicates = 0; const seen = new Set<string>();
  rows.slice(1).forEach((r, idx) => {
    const c: Contact = {};
    Object.entries(map).forEach(([i, f]) => { const v = (r[+i] || "").trim(); if (v) c[f] = v; });
    if (!c.company_name && !c.email) { errors.push(`Ligne ${idx + 2} : ni société ni email`); return; }
    if (c.email && !z.string().email().safeParse(c.email).success) { errors.push(`Ligne ${idx + 2} : email invalide (${c.email})`); return; }
    const key = c.email ? strip(c.email) : `${strip(c.company_name || "")}|${strip(c.country || "")}`;
    if (seen.has(key)) { duplicates++; return; }
    seen.add(key); valid.push(c);
  });
  return { valid, errors, duplicates, mapped: Object.values(map) };
}

export default function ExportVinsInviteForm({ buildRedirect, onDone }: { buildRedirect: () => string; onDone: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [domain, setDomain] = useState("");
  const [mission, setMission] = useState("");
  const [discount, setDiscount] = useState(true);
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<ReturnType<typeof analyse> | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const onFile = async (f?: File) => {
    if (!f) return;
    setFileName(f.name); setResult(null);
    const rows = parseCsv(await f.text());
    setPreview(analyse(rows));
  };

  const ready = z.string().email().safeParse(email.trim()).success && domain.trim() && mission.trim() && preview && preview.valid.length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || !preview) return;
    setLoading(true); setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-invite-user", {
        body: {
          type: "exportvins", email: email.trim(), domainName: domain.trim(), missionName: mission.trim(),
          discountEligible: discount, lang, contacts: preview.valid, redirectTo: buildRedirect(),
        },
      });
      if (error) throw error;
      const d = data as any;
      if (d?.error) throw new Error(d.error);
      const msg = `${d.imported} prospect(s) intégré(s) au CRM de ${domain.trim()}` +
        (d.duplicates ? `, ${d.duplicates} doublon(s) ignoré(s)` : "") +
        (d.isPremium ? " — compte déjà abonné : abonnement conservé, pas d'essai" : "") +
        ". Invitation envoyée.";
      setResult(msg);
      toast({ title: "Accès CRM créé", description: msg });
      setEmail(""); setDomain(""); setMission(""); setPreview(null); setFileName("");
      onDone();
    } catch (err: any) {
      toast({ title: "Erreur", description: err?.message || "Échec", variant: "destructive" });
      onDone();
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="ev-email">Email du client</Label>
          <Input id="ev-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@domaine.com" required maxLength={255} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ev-domain">Nom du domaine</Label>
          <Input id="ev-domain" value={domain} onChange={(e) => setDomain(e.target.value)} required maxLength={200} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ev-mission">Nom de la mission</Label>
          <Input id="ev-mission" value={mission} onChange={(e) => setMission(e.target.value)} placeholder="Ex. Danemark 2026" required maxLength={200} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ev-csv">Importateurs qualifiés (CSV)</Label>
        <label htmlFor="ev-csv" className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:bg-secondary/40">
          <Upload className="h-4 w-4" /> {fileName || "Choisir un fichier CSV (; ou ,)"}
        </label>
        <input id="ev-csv" type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <p className="text-xs text-muted-foreground">Colonnes reconnues : société, pays, contact, email, téléphone, site, adresse, cuvées, commentaires, prochaine action, description importateur, pourquoi pertinent (facultatives).</p>
      </div>

      {preview && (
        <div className="rounded-md border border-border bg-secondary/30 p-3 text-sm space-y-1">
          <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> <strong>{preview.valid.length}</strong> importateur(s) prêt(s) à importer</p>
          {preview.duplicates > 0 && <p className="text-muted-foreground">{preview.duplicates} doublon(s) dans le fichier, ignoré(s)</p>}
          {preview.errors.length > 0 && (
            <div className="text-destructive">
              <p className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {preview.errors.length} ligne(s) en erreur</p>
              <ul className="ml-6 list-disc text-xs">{preview.errors.slice(0, 5).map((e) => <li key={e}>{e}</li>)}</ul>
            </div>
          )}
          {preview.mapped.length === 0 && <p className="text-destructive">Aucune colonne reconnue : vérifiez la ligne d'en-tête.</p>}
          {preview.valid.some((c) => c.importer_description || c.relevance_reason) && (
            <div className="max-h-80 overflow-y-auto space-y-2 pt-2">
              {preview.valid.map((c, i) => (c.importer_description || c.relevance_reason) && (
                <details key={i} className="rounded border border-border bg-background p-2">
                  <summary className="cursor-pointer font-medium">{c.company_name || c.email}</summary>
                  {c.importer_description && <p className="mt-2 whitespace-pre-wrap text-xs"><strong>Description :</strong> {c.importer_description}</p>}
                  {c.relevance_reason && <p className="mt-2 whitespace-pre-wrap text-xs"><strong>Pourquoi pertinent :</strong> {c.relevance_reason}</p>}
                </details>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Les contacts déjà présents dans le CRM du client seront aussi ignorés, sans être modifiés.</p>
        </div>
      )}

      <div className="flex items-center gap-3 text-sm">
        <span>Langue de l'email :</span>
        {(["fr","en"] as const).map((l) => (
          <button key={l} type="button" onClick={() => setLang(l)} className={`rounded border px-2 py-0.5 ${lang===l ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>{l.toUpperCase()}</button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={discount} onCheckedChange={(v) => setDiscount(v === true)} />
        Tarif privilégié WineExporters 99 € HT/mois
      </label>
      <p className="text-xs text-muted-foreground">CRM offert 30 jours à partir de la première connexion du client. Aucun abonnement ni statut payant n'est attribué.</p>

      <Button type="submit" disabled={!ready || loading} className="w-full sm:w-auto">
        <Send className="h-4 w-4 mr-2" />
        {loading ? "Création en cours…" : "Créer l'accès CRM et envoyer l'invitation"}
      </Button>
      {result && <p className="text-sm text-primary">{result}</p>}
    </form>
  );
}
