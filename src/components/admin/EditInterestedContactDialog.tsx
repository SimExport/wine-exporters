import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

export interface EditableInterestedContact {
  id: string;
  contact_name: string | null;
  email: string | null;
  company_name: string | null;
  country: string | null;
  phone: string | null;
  description: string | null;
  recommended_actions: string | null;
  message: string | null;
  score: number | null;
}

interface Props {
  contact: EditableInterestedContact | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (updated: EditableInterestedContact) => void;
}

export function EditInterestedContactDialog({ contact, onOpenChange, onSaved }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditableInterestedContact | null>(contact);

  useEffect(() => setForm(contact), [contact]);

  const set = (k: keyof EditableInterestedContact, v: string) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = async () => {
    if (!form) return;
    const name = (form.company_name || '').trim();
    if (!name) {
      toast({
        title: t('adminCampaigns.editContact.invalidTitle', { defaultValue: 'Champ manquant' }),
        description: t('adminCampaigns.editContact.companyRequired', { defaultValue: 'La société est obligatoire.' }),
        variant: 'destructive',
      });
      return;
    }
    const rawScore = form.score;
    const score = rawScore === null || (rawScore as any) === '' ? null : Number(rawScore);
    if (score !== null && (Number.isNaN(score) || score < 0 || score > 10)) {
      toast({
        title: t('adminCampaigns.editContact.invalidTitle', { defaultValue: 'Champ manquant' }),
        description: t('adminCampaigns.editContact.scoreRange', { defaultValue: 'Le score doit être compris entre 0 et 10.' }),
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      contact_name: form.contact_name?.trim() || null,
      email: form.email?.trim() || null,
      company_name: name,
      country: form.country?.trim() || null,
      phone: form.phone?.trim() || null,
      description: form.description?.trim() || null,
      recommended_actions: form.recommended_actions?.trim() || null,
      message: form.message?.trim() || null,
      score,
    };

    setSaving(true);
    const { error } = await supabase
      .from('campaign_interested_contacts')
      .update(payload)
      .eq('id', form.id);
    setSaving(false);

    if (error) {
      toast({
        title: t('adminCampaigns.editContact.errorTitle', { defaultValue: 'Erreur' }),
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: t('adminCampaigns.editContact.saved', { defaultValue: 'Prospect mis à jour' }),
    });
    onSaved({ ...form, ...payload });
    onOpenChange(false);
  };

  return (
    <Dialog open={!!contact} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('adminCampaigns.editContact.title', { defaultValue: 'Modifier le prospect' })}</DialogTitle>
          <DialogDescription>
            {t('adminCampaigns.editContact.description', {
              defaultValue: 'Ces informations sont celles affichées côté utilisateur.',
            })}
          </DialogDescription>
        </DialogHeader>

        {form && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t('adminCampaigns.editContact.company', { defaultValue: 'Société' })}</Label>
                <Input value={form.company_name ?? ''} onChange={(e) => set('company_name', e.target.value)} maxLength={200} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('adminCampaigns.editContact.contactName', { defaultValue: 'Nom du contact' })}</Label>
                <Input value={form.contact_name ?? ''} onChange={(e) => set('contact_name', e.target.value)} maxLength={200} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('adminCampaigns.editContact.email', { defaultValue: 'Email' })}</Label>
                <Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} maxLength={255} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('adminCampaigns.editContact.phone', { defaultValue: 'Téléphone' })}</Label>
                <Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} maxLength={50} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('adminCampaigns.editContact.country', { defaultValue: 'Pays' })}</Label>
                <Input value={form.country ?? ''} onChange={(e) => set('country', e.target.value)} maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('adminCampaigns.editContact.score', { defaultValue: 'Score /10' })}</Label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={form.score ?? ''}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, score: e.target.value === '' ? null : Number(e.target.value) } : f))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t('adminCampaigns.editContact.message', { defaultValue: 'Message du prospect' })}</Label>
              <Textarea
                rows={4}
                value={form.message ?? ''}
                onChange={(e) => set('message', e.target.value)}
                maxLength={1000}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t('adminCampaigns.editContact.descriptionField', { defaultValue: 'Description' })}</Label>
              <Textarea
                rows={6}
                value={form.description ?? ''}
                onChange={(e) => set('description', e.target.value)}
                maxLength={4000}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t('adminCampaigns.editContact.actions', { defaultValue: 'Actions recommandées' })}</Label>
              <Textarea
                rows={5}
                value={form.recommended_actions ?? ''}
                onChange={(e) => set('recommended_actions', e.target.value)}
                maxLength={4000}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('common.cancel', { defaultValue: 'Annuler' })}
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('common.save', { defaultValue: 'Enregistrer' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}