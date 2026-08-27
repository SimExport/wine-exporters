import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Megaphone, Search, Download } from 'lucide-react';

export interface UserCreditsRow {
  campaign_credits: number;
  search_credits: number;
  export_credits: number;
  next_reset_date?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userLabel?: string | null;
  credits: UserCreditsRow | null;
  onSaved: (credits: UserCreditsRow) => void;
}

const toInt = (v: string): number => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export function EditUserCreditsDialog({
  open,
  onOpenChange,
  userId,
  userLabel,
  credits,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const [campaign, setCampaign] = useState('0');
  const [search, setSearch] = useState('0');
  const [exports, setExports] = useState('0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCampaign(String(credits?.campaign_credits ?? 0));
    setSearch(String(credits?.search_credits ?? 0));
    setExports(String(credits?.export_credits ?? 0));
  }, [open, credits]);

  const bump = (
    setter: (v: string) => void,
    current: string,
    delta: number
  ) => setter(String(Math.max(0, toInt(current) + delta)));

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase.rpc('admin_set_user_credits', {
      _user_id: userId,
      _campaign: toInt(campaign),
      _search: toInt(search),
      _export: toInt(exports),
    });
    setSaving(false);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }

    const row = (Array.isArray(data) ? data[0] : data) as UserCreditsRow | null;
    onSaved(
      row ?? {
        campaign_credits: toInt(campaign),
        search_credits: toInt(search),
        export_credits: toInt(exports),
        next_reset_date: credits?.next_reset_date ?? null,
      }
    );
    toast({
      title: 'Crédits mis à jour',
      description: `${userLabel || 'Utilisateur'} — ${toInt(campaign)} campagne(s), ${toInt(search)} recherche(s), ${toInt(exports)} export(s)`,
    });
    onOpenChange(false);
  };

  const rows: {
    key: string;
    icon: typeof Megaphone;
    label: string;
    hint: string;
    value: string;
    setValue: (v: string) => void;
    quick: number;
  }[] = [
    {
      key: 'campaign',
      icon: Megaphone,
      label: 'Crédits campagne',
      hint: 'Débloque le lancement d\'une campagne',
      value: campaign,
      setValue: setCampaign,
      quick: 1,
    },
    {
      key: 'search',
      icon: Search,
      label: 'Crédits recherche sur-mesure',
      hint: 'Débloque une demande de recherche',
      value: search,
      setValue: setSearch,
      quick: 1,
    },
    {
      key: 'export',
      icon: Download,
      label: 'Crédits export',
      hint: 'Téléchargement des importateurs (reset auto à 500/mois)',
      value: exports,
      setValue: setExports,
      quick: 100,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier les crédits</DialogTitle>
          <DialogDescription>
            {userLabel ? `${userLabel} — ` : ''}Le renouvellement mensuel automatique n'est pas
            affecté.
            {credits?.next_reset_date
              ? ` Prochain reset : ${new Date(credits.next_reset_date).toLocaleDateString('fr-FR')}.`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {rows.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.key} className="space-y-1.5">
                <Label className="flex items-center gap-2 text-sm">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {r.label}
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => bump(r.setValue, r.value, -r.quick)}
                    disabled={saving}
                  >
                    −
                  </Button>
                  <Input
                    type="number"
                    min={0}
                    value={r.value}
                    onChange={(e) => r.setValue(e.target.value)}
                    className="h-9 w-28 text-center"
                    disabled={saving}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={() => bump(r.setValue, r.value, r.quick)}
                    disabled={saving}
                  >
                    +{r.quick}
                  </Button>
                  <span className="text-xs text-muted-foreground">{r.hint}</span>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
