import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { BarChart3, Loader2 } from 'lucide-react';

interface Props {
  campaign: {
    id: string;
    stats_opens: number | null;
    stats_clicks: number | null;
  };
  onSaved: () => void;
}

export function CampaignStatsPopover({ campaign, onSaved }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [opens, setOpens] = useState<string>(campaign.stats_opens?.toString() ?? '');
  const [clicks, setClicks] = useState<string>(campaign.stats_clicks?.toString() ?? '');

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('campaigns')
      .update({
        stats_opens: opens === '' ? null : Number(opens),
        stats_clicks: clicks === '' ? null : Number(clicks),
      })
      .eq('id', campaign.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('adminCampaigns.table.statsSaved') });
    setOpen(false);
    onSaved();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline">
          <BarChart3 className="h-4 w-4 mr-1" />
          {t('adminCampaigns.table.editStats')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3">
        <h4 className="font-medium text-sm">{t('adminCampaigns.table.statsPopoverTitle')}</h4>
        <div className="space-y-2">
          <Label htmlFor={`opens-${campaign.id}`}>{t('adminCampaigns.table.openRate')}</Label>
          <Input
            id={`opens-${campaign.id}`}
            type="number"
            min={0}
            value={opens}
            onChange={(e) => setOpens(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`clicks-${campaign.id}`}>{t('adminCampaigns.table.interestedClicks')}</Label>
          <Input
            id={`clicks-${campaign.id}`}
            type="number"
            min={0}
            value={clicks}
            onChange={(e) => setClicks(e.target.value)}
          />
        </div>
        <Button size="sm" className="w-full" onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          {t('adminCampaigns.table.saveStats')}
        </Button>
      </PopoverContent>
    </Popover>
  );
}