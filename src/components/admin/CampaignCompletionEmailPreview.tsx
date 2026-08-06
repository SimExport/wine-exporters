import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, Send } from 'lucide-react';

interface PreviewData {
  subject: string;
  html: string;
  to: string;
  bcc: string | null;
  qualifiedCount: number;
}

interface Props {
  campaignId: string | null;
  campaignName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the admin confirms sending. Should mark completed + send the email. */
  onConfirm: () => Promise<void> | void;
}

export function CampaignCompletionEmailPreview({
  campaignId, campaignName, open, onOpenChange, onConfirm,
}: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);

  useEffect(() => {
    if (!open || !campaignId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPreview(null);
    supabase.functions
      .invoke('notify-campaign-completed', { body: { campaignId, preview: true } })
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err || !data?.html) {
          setError(err?.message || 'preview_failed');
        } else {
          setPreview(data as PreviewData);
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, campaignId]);

  const confirm = async () => {
    setSending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            {t('adminCampaigns.emailPreview.title', { defaultValue: 'Aperçu de l’email de fin de campagne' })}
          </DialogTitle>
          <DialogDescription>
            {t('adminCampaigns.emailPreview.description', {
              name: campaignName,
              defaultValue: `Vérifiez le contenu avant l’envoi pour « ${campaignName} ».`,
            })}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            {t('adminCampaigns.emailPreview.loading', { defaultValue: 'Génération de l’aperçu…' })}
          </div>
        )}

        {error && (
          <div className="py-8 text-center text-sm text-destructive">
            {t('adminCampaigns.emailPreview.error', { defaultValue: 'Impossible de générer l’aperçu.' })}
          </div>
        )}

        {preview && (
          <div className="space-y-3">
            <div className="space-y-1 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">
                  {t('adminCampaigns.emailPreview.to', { defaultValue: 'Destinataire' })} :
                </span>
                <span className="font-medium">{preview.to}</span>
                {preview.bcc && (
                  <Badge variant="outline">CCI {preview.bcc}</Badge>
                )}
                <Badge variant="secondary">
                  {t('adminCampaigns.emailPreview.qualified', {
                    count: preview.qualifiedCount,
                    defaultValue: `${preview.qualifiedCount} prospects qualifiés`,
                  })}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {t('adminCampaigns.emailPreview.subject', { defaultValue: 'Objet' })} :
                </span>{' '}
                <span className="font-medium">{preview.subject}</span>
              </div>
            </div>
            <iframe
              title="email-preview"
              srcDoc={preview.html}
              sandbox=""
              className="w-full h-[420px] rounded-md border bg-background"
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            {t('adminCampaigns.emailPreview.cancel', { defaultValue: 'Annuler' })}
          </Button>
          <Button onClick={confirm} disabled={sending || loading || !!error}>
            {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            {t('adminCampaigns.emailPreview.confirm', { defaultValue: 'Terminer et envoyer' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}