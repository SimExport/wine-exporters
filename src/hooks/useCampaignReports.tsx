import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CampaignReport {
  id: string;
  user_id: string;
  campaign_name: string;
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  file_format: string | null;
  notified_at: string | null;
  created_at: string;
}

export function useCampaignReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState<CampaignReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    if (!user) {
      setReports([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('campaign_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) setReports(data as CampaignReport[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { reports, loading, refetch: fetchReports };
}