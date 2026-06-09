import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentEmail: string | null;
  displayName: string | null;
  onChanged: (newEmail: string) => void;
}

export function ChangeUserEmailDialog({
  open,
  onOpenChange,
  userId,
  currentEmail,
  displayName,
  onChanged,
}: Props) {
  const { toast } = useToast();
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setNewEmail('');
  }, [open]);

  const submit = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: 'Email invalide', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('admin-change-user-email', {
      body: { user_id: userId, new_email: email },
    });
    setSaving(false);
    if (error || (data as any)?.error) {
      const msg = (data as any)?.error ?? error?.message ?? 'Erreur inconnue';
      const friendly =
        msg === 'email_already_used'
          ? 'Cet email est déjà utilisé par un autre compte.'
          : msg === 'same_email'
            ? 'C\'est déjà l\'adresse actuelle.'
            : msg === 'invalid_email'
              ? 'Format d\'email invalide.'
              : msg;
      toast({ title: 'Erreur', description: friendly, variant: 'destructive' });
      return;
    }
    toast({
      title: 'Email mis à jour',
      description: `${displayName ?? userId} → ${email}`,
    });
    onChanged(email);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Changer l'email de {displayName ?? 'cet utilisateur'}</DialogTitle>
          <DialogDescription>
            Le mot de passe, les campagnes, leads, crédits et l'abonnement Stripe restent inchangés.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs text-muted-foreground">Email actuel</Label>
            <p className="font-mono text-sm mt-1">{currentEmail ?? '—'}</p>
          </div>
          <div>
            <Label htmlFor="new-email">Nouvel email</Label>
            <Input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="nouveau@domaine.com"
              autoFocus
              className="mt-1"
            />
          </div>
          <div className="flex gap-2 text-xs bg-muted p-3 rounded-md">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              L'utilisateur pourra immédiatement se connecter avec la nouvelle adresse. Aucun email
              de confirmation ne lui sera envoyé.
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={saving || !newEmail.trim()}>
            {saving ? 'Mise à jour…' : 'Confirmer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}