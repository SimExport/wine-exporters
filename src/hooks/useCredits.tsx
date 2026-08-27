import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { formatDateLong } from '@/lib/format';

export interface UserCredits {
  campaign_credits: number;
  search_credits: number;
  export_credits: number;
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
    // Lazy monthly reset for export credits — ignore errors silently.
    try {
      await supabase.rpc('ensure_export_credits_reset');
    } catch (e) {
      // no-op
    }
    const { data, error } = await supabase
      .from('user_credits')
      .select('campaign_credits, search_credits, export_credits, next_reset_date')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user_credits:', error);
      setCredits(null);
    } else {
      setCredits(
        data ?? { campaign_credits: 0, search_credits: 0, export_credits: 0, next_reset_date: null }
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  // Keep credits in sync when an admin adjusts them while the tab is open.
  useEffect(() => {
    if (!user) return;
    const onFocus = () => fetchCredits();
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchCredits();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, fetchCredits]);

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

  const consumeExportCredits = useCallback(async (count: number): Promise<{
    ok: boolean;
    remaining: number;
  }> => {
    const { data, error } = await supabase.rpc('consume_export_credits', { _count: count });
    if (error) {
      console.error('consume_export_credits error:', error);
      return { ok: false, remaining: credits?.export_credits ?? 0 };
    }
    const remaining = typeof data === 'number' ? data : -1;
    if (remaining < 0) return { ok: false, remaining: credits?.export_credits ?? 0 };
    await fetchCredits();
    return { ok: true, remaining };
  }, [credits, fetchCredits]);

  const resetDateLabel = formatResetDate(credits?.next_reset_date ?? null);

  const noCreditsMessage = (kind: 'campaign' | 'search' | 'export') => {
    if (kind === 'campaign') return t('credits.noCreditsCampaign', { date: resetDateLabel });
    if (kind === 'export') return t('credits.noCreditsExport', { date: resetDateLabel });
    return t('credits.noCreditsSearch', { date: resetDateLabel });
  };

  return {
    credits,
    loading,
    refetch: fetchCredits,
    consumeCampaignCredit,
    consumeSearchCredit,
    consumeExportCredits,
    resetDateLabel,
    noCreditsMessage,
    campaignCredits: credits?.campaign_credits ?? 0,
    searchCredits: credits?.search_credits ?? 0,
    exportCredits: credits?.export_credits ?? 0,
  };
};