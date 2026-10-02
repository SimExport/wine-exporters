import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

type AnyRow = Record<string, any>;

const TEXT = ['domain_name', 'contact_name', 'location', 'aoc', 'website', 'online_video_url', 'description',
  'organic_body', 'current_markets', 'priority_markets', 'avoid_markets', 'target_buyer_description'] as const;
const ARRAYS = ['wine_colors', 'wine_types', 'grape_varieties', 'cuvees', 'certifications', 'strengths'] as const;
const NUMS = ['surface_area', 'bottles_per_year', 'organic_year'] as const;
const BOOLS = ['organic_conversion', 'is_published', 'onboarding_completed'] as const;
const SOCIALS = ['twitter', 'facebook', 'linkedin', 'instagram'] as const;

const LABELS: Record<string, string> = {
  domain_name: 'Domaine', contact_name: 'Contact', location: 'Localisation', aoc: 'AOC', website: 'Site web',
  online_video_url: 'Vidéo en ligne', description: 'Description', surface_area: 'Surface (ha)',
  bottles_per_year: 'Bouteilles / an', wine_colors: 'Couleurs', wine_types: 'Types de vin',
  grape_varieties: 'Cépages', cuvees: 'Cuvées (legacy)', certifications: 'Certifications',
  organic_conversion: 'Conversion bio', organic_body: 'Organisme bio', organic_year: 'Année conversion',
  current_markets: 'Marchés actuels', priority_markets: 'Marchés prioritaires', avoid_markets: 'Marchés à éviter',
  target_buyer_description: 'Acheteur cible', strengths: 'Points forts', is_published: 'Profil publié',
  onboarding_completed: 'Onboarding terminé', twitter: 'Twitter', facebook: 'Facebook', linkedin: 'LinkedIn', instagram: 'Instagram',
};

const SECTIONS: { title: string; fields: string[] }[] = [
  { title: 'Identité', fields: ['domain_name', 'contact_name', 'location', 'aoc', 'website', 'online_video_url', 'description'] },
  { title: 'Production', fields: ['surface_area', 'bottles_per_year', 'wine_colors', 'wine_types', 'grape_varieties', 'cuvees'] },
  { title: 'Bio & certifications', fields: ['certifications', 'organic_conversion', 'organic_body', 'organic_year'] },
  { title: 'Marchés', fields: ['current_markets', 'priority_markets', 'avoid_markets', 'target_buyer_description', 'strengths'] },
  { title: 'Réseaux sociaux', fields: [...SOCIALS] },
  { title: 'Statut', fields: ['is_published', 'onboarding_completed'] },
];

const LONG = new Set(['aoc', 'description', 'priority_markets', 'current_markets', 'avoid_markets', 'target_buyer_description']);

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
  profile: AnyRow | null;
  onSaved: (p: AnyRow) => void;
}

export function EditUserProfileDialog({ open, onOpenChange, userId, profile, onSaved }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const p = profile || {};
    const f: Record<string, any> = {};
    TEXT.forEach((k) => (f[k] = p[k] ?? ''));
    ARRAYS.forEach((k) => (f[k] = Array.isArray(p[k]) ? p[k].join(', ') : ''));
    NUMS.forEach((k) => (f[k] = p[k] ?? ''));
    BOOLS.forEach((k) => (f[k] = !!p[k]));
    const s = p.social_media && typeof p.social_media === 'object' ? p.social_media : {};
    SOCIALS.forEach((k) => (f[k] = s[k] ?? ''));
    setForm(f);
  }, [open, profile]);

  const set = (k: string, v: any) => setForm((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    const payload: AnyRow = {};
    TEXT.forEach((k) => (payload[k] = String(form[k] ?? '').trim() || null));
    ARRAYS.forEach((k) => (payload[k] = String(form[k] ?? '').split(',').map((x) => x.trim()).filter(Boolean)));
    NUMS.forEach((k) => {
      const v = String(form[k] ?? '').trim().replace(',', '.');
      const n = v === '' ? null : Number(v);
      payload[k] = n == null || Number.isNaN(n) ? null : k === 'surface_area' ? n : Math.round(n);
    });
    BOOLS.forEach((k) => (payload[k] = !!form[k]));
    const prevSocial = profile?.social_media && typeof profile.social_media === 'object' ? profile.social_media : {};
    payload.social_media = { ...prevSocial, ...Object.fromEntries(SOCIALS.map((k) => [k, String(form[k] ?? '').trim()])) };

    setSaving(true);
    const { data, error } = await supabase.from('profiles').update(payload).eq('user_id', userId).select('*').maybeSingle();
    setSaving(false);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    onSaved(data ?? { ...(profile || {}), ...payload });
    toast({ title: 'Profil mis à jour' });
    onOpenChange(false);
  };

  const renderField = (k: string) => {
    const label = LABELS[k];
    if ((BOOLS as readonly string[]).includes(k)) {
      return (
        <div key={k} className="flex items-center justify-between gap-3 rounded-md border p-3">
          <Label htmlFor={k}>{label}</Label>
          <Switch id={k} checked={!!form[k]} onCheckedChange={(v) => set(k, v)} />
        </div>
      );
    }
    const isArray = (ARRAYS as readonly string[]).includes(k);
    const isNum = (NUMS as readonly string[]).includes(k);
    return (
      <div key={k} className={`space-y-1.5 ${LONG.has(k) ? 'md:col-span-2' : ''}`}>
        <Label htmlFor={k}>{label}{isArray && <span className="text-xs text-muted-foreground"> (séparés par des virgules)</span>}</Label>
        {LONG.has(k) ? (
          <Textarea id={k} value={form[k] ?? ''} onChange={(e) => set(k, e.target.value)} className="min-h-[80px]" />
        ) : (
          <Input id={k} type={isNum ? 'number' : 'text'} value={form[k] ?? ''} onChange={(e) => set(k, e.target.value)} />
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le profil domaine</DialogTitle>
          <DialogDescription>Plan, rôle, email et crédits se modifient depuis leurs outils dédiés.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-2">
          {SECTIONS.map((s) => (
            <div key={s.title} className="space-y-3">
              <h3 className="text-sm font-semibold">{s.title}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{s.fields.map(renderField)}</div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
