import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/lib/format';

interface ParseResult {
  total_candidates: number;
  updated: number;
  skipped: number;
  errors?: string[];
}

export function ParseAddressesButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleParse = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: t('parseAddresses.errorTitle'), description: t('parseAddresses.errorNotAuth'), variant: 'destructive' });
        return;
      }

      const { data, error } = await supabase.functions.invoke('parse-addresses', {
        method: 'POST',
      });

      if (error) throw error;

      const res = data as ParseResult;
      setResult(res);
      toast({
        title: t('parseAddresses.doneTitle'),
        description: t('parseAddresses.doneDescription', {
          updated: formatNumber(res.updated),
          skipped: formatNumber(res.skipped),
          total: formatNumber(res.total_candidates + res.skipped),
        }),
      });
    } catch (err: any) {
      toast({ title: t('parseAddresses.errorTitle'), description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleParse}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MapPin className="h-4 w-4 mr-2" />}
        {t('parseAddresses.button')}
      </Button>
      {result && (
        <p className="text-xs text-muted-foreground">
          {t('parseAddresses.summary', {
            updated: formatNumber(result.updated),
            skipped: formatNumber(result.skipped),
            total: formatNumber(result.total_candidates + result.skipped),
          })}
          {result.errors && ` · ${t('parseAddresses.errorsCount', { count: result.errors.length })}`}
        </p>
      )}
    </div>
  );
}
