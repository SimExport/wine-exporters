import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/** Lot B rollout: admins and accounts with the `campaign_email_editor` entitlement. Enforced server-side too. */
export const useCampaignEditorAccess = () => {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    if (!user) { setEnabled(false); setLoading(false); return; }
    setLoading(true);
    (supabase.rpc as any)('has_campaign_editor_access', { _user_id: user.id })
      .then(({ data }: any) => { if (!cancelled) setEnabled(data === true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);
  return { enabled, loading };
};
