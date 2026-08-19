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
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const run = async (force: boolean) => {
    setLoading(true);
    setProgress(null);
    let doneCount = 0;
    try {
      let total = 0;
      let candidates = 0;
      let guard = 0;
      const processedIds: string[] = [];

      // The Edge Function processes a small batch per invocation to stay within
      // its execution time limit; loop until nothing is left.
      while (guard < 40) {
        guard++;
        const { data, error } = await supabase.functions.invoke('enrich-campaign-prospects', {
          body: { campaign_id: campaignId, force, limit: 5, exclude_ids: processedIds },
        });
        if (error) throw error;
        total = data?.total ?? total;
        if (guard === 1) candidates = data?.candidates ?? 0;
        doneCount += data?.enriched ?? 0;
        if (Array.isArray(data?.processed_ids)) processedIds.push(...data.processed_ids);
        setProgress({ done: doneCount, total: candidates });
        if (!data?.remaining || (data?.processed ?? 0) === 0) break;
      }

      toast({
        title: t('adminCampaigns.enrich.successTitle'),
        description:
          candidates === 0
            ? t('adminCampaigns.enrich.alreadyDone', { total })
            : t('adminCampaigns.enrich.successDesc', {
                count: doneCount,
                total,
                already: Math.max(0, total - candidates),
              }),
      });
      onDone?.();
    } catch (err: any) {
      console.error('enrich-campaign-prospects failed', err);
      toast({
        title: t('adminCampaigns.enrich.errorTitle'),
        description: `${doneCount} contact(s) traité(s) avant l'erreur. ${
          err?.message ?? String(err)
        }`,
        variant: 'destructive',
      });
      onDone?.();
    } finally {
      setLoading(false);
      setProgress(null);
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
          {loading && progress
            ? `${progress.done}/${progress.total || '?'}`
            : t('adminCampaigns.enrich.label')}
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