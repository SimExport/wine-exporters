import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type Mode = 'stats' | 'clicks' | 'both';

interface Props {
  campaignId: string;
  brevoCampaignId: number | null | undefined;
  onSynced?: () => void;
}

export function BrevoSyncButton({ campaignId, brevoCampaignId, onSynced }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState<Mode | null>(null);
  const [askIdOpen, setAskIdOpen] = useState<Mode | null>(null);
  const [idInput, setIdInput] = useState('');

  const runSync = async (mode: Mode) => {
    setLoading(mode);
    try {
      const { data, error } = await supabase.functions.invoke('sync-brevo-campaign', {
        body: { campaign_id: campaignId, mode },
      });
      if (error) throw error;
      const parts: string[] = [];
      if (typeof data?.opens === 'number') parts.push(`${t('adminCampaigns.brevoSync.opens')}: ${data.opens}`);
      if (typeof data?.clicks === 'number') parts.push(`${t('adminCampaigns.brevoSync.clicks')}: ${data.clicks}`);
      if (typeof data?.imported_leads === 'number') {
        parts.push(
          `${t('adminCampaigns.brevoSync.imported')}: ${data.imported_leads}` +
            (typeof data?.skipped === 'number' ? ` (${t('adminCampaigns.brevoSync.skipped')}: ${data.skipped})` : ''),
        );
      }
      toast({
        title: t('adminCampaigns.brevoSync.successTitle'),
        description: parts.join(' • ') || 'OK',
      });
      onSynced?.();
    } catch (err: any) {
      console.error('sync-brevo-campaign failed', err);
      toast({
        title: t('adminCampaigns.brevoSync.errorTitle'),
        description: err?.message ?? String(err),
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleAction = (mode: Mode) => {
    if (!brevoCampaignId) {
      setIdInput('');
      setAskIdOpen(mode);
      return;
    }
    runSync(mode);
  };

  const confirmIdAndRun = async () => {
    const parsed = Number(idInput.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast({
        title: t('adminCampaigns.brevoSync.invalidId'),
        variant: 'destructive',
      });
      return;
    }
    const mode = askIdOpen!;
    setAskIdOpen(null);
    setLoading(mode);
    const { error } = await supabase
      .from('campaigns')
      .update({ brevo_campaign_id: parsed })
      .eq('id', campaignId);
    if (error) {
      setLoading(null);
      toast({ title: t('adminCampaigns.brevoSync.errorTitle'), description: error.message, variant: 'destructive' });
      return;
    }
    await runSync(mode);
  };

  const isLoading = loading !== null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            {t('adminCampaigns.brevoSync.label')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleAction('stats')}>
            {t('adminCampaigns.brevoSync.syncStats')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAction('clicks')}>
            {t('adminCampaigns.brevoSync.importClicks')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAction('both')}>
            {t('adminCampaigns.brevoSync.both')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={askIdOpen !== null} onOpenChange={(o) => !o && setAskIdOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('adminCampaigns.brevoSync.setIdTitle')}</DialogTitle>
            <DialogDescription>{t('adminCampaigns.brevoSync.setIdDescription')}</DialogDescription>
          </DialogHeader>
          <Input
            value={idInput}
            onChange={(e) => setIdInput(e.target.value)}
            placeholder="e.g. 42"
            type="number"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAskIdOpen(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={confirmIdAndRun}>{t('common.confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}