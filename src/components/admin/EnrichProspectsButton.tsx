import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  campaignId: string;
  onDone?: () => void;
}

export function EnrichProspectsButton({ campaignId, onDone }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-campaign-prospects', {
        body: { campaign_id: campaignId },
      });
      if (error) throw error;
      toast({
        title: t('adminCampaigns.enrich.successTitle'),
        description: t('adminCampaigns.enrich.successDesc', {
          count: data?.enriched ?? 0,
          total: data?.total ?? 0,
        }),
      });
      onDone?.();
    } catch (err: any) {
      console.error('enrich-campaign-prospects failed', err);
      toast({
        title: t('adminCampaigns.enrich.errorTitle'),
        description: err?.message ?? String(err),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={run} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4 mr-1" />
      )}
      {t('adminCampaigns.enrich.label')}
    </Button>
  );
}