import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { formatDateLong } from '@/lib/format';

export interface UserCredits {
  campaign_credits: number;
  search_credits: number;
  next_reset_date: string | null;
}

export const useCredits = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);

  const formatResetDate = (date: string | null): string => {
    if (!date) return t('credits.nextPeriod');
    try {
      return formatDateLong(date) || date;
    } catch {
      return date;
    }
  };

  const fetchCredits = useCallback(async () => {
    if (!user) {
      setCredits(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('user_credits')
      .select('campaign_credits, search_credits, next_reset_date')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user_credits:', error);
      setCredits(null);
    } else {
      setCredits(
        data ?? { campaign_credits: 0, search_credits: 0, next_reset_date: null }
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const consumeCampaignCredit = useCallback(async (): Promise<{
    ok: boolean;
    remaining: number;
  }> => {
    const { data, error } = await supabase.rpc('consume_campaign_credit');
    if (error) {
      console.error('consume_campaign_credit error:', error);
      return { ok: false, remaining: credits?.campaign_credits ?? 0 };
    }
    const remaining = typeof data === 'number' ? data : -1;
    if (remaining < 0) return { ok: false, remaining: 0 };
    await fetchCredits();
    return { ok: true, remaining };
  }, [credits, fetchCredits]);

  const consumeSearchCredit = useCallback(async (): Promise<{
    ok: boolean;
    remaining: number;
  }> => {
    const { data, error } = await supabase.rpc('consume_search_credit');
    if (error) {
      console.error('consume_search_credit error:', error);
      return { ok: false, remaining: credits?.search_credits ?? 0 };
    }
    const remaining = typeof data === 'number' ? data : -1;
    if (remaining < 0) return { ok: false, remaining: 0 };
    await fetchCredits();
    return { ok: true, remaining };
  }, [credits, fetchCredits]);

  const resetDateLabel = formatResetDate(credits?.next_reset_date ?? null);

  const noCreditsMessage = (kind: 'campaign' | 'search') =>
    kind === 'campaign'
      ? t('credits.noCreditsCampaign', { date: resetDateLabel })
      : t('credits.noCreditsSearch', { date: resetDateLabel });

  return {
    credits,
    loading,
    refetch: fetchCredits,
    consumeCampaignCredit,
    consumeSearchCredit,
    resetDateLabel,
    noCreditsMessage,
    campaignCredits: credits?.campaign_credits ?? 0,
    searchCredits: credits?.search_credits ?? 0,
  };
};