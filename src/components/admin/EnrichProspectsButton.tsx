import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sparkles, Loader2, ChevronDown } from 'lucide-react';
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

  const run = async (force: boolean) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-campaign-prospects', {
        body: { campaign_id: campaignId, force },
      });
      if (error) throw error;
      const total = data?.total ?? 0;
      const candidates = data?.candidates ?? 0;
      toast({
        title: t('adminCampaigns.enrich.successTitle'),
        description:
          candidates === 0
            ? t('adminCampaigns.enrich.alreadyDone', { total })
            : t('adminCampaigns.enrich.successDesc', {
                count: data?.enriched ?? 0,
                total,
                already: Math.max(0, total - candidates),
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-1" />
          )}
          {t('adminCampaigns.enrich.label')}
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => run(false)}>
          {t('adminCampaigns.enrich.missingLabel')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run(true)}>
          {t('adminCampaigns.enrich.forceLabel')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}