import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/** Lot B rollout: admins and accounts with the `campaign_email_editor` entitlement. Enforced server-side too. */
export const useCampaignEditorAccess = () => {
  const { user } = useAuth();
  // Stable identity: a session refresh (tab focus) gives a new user object with the same id and must not
  // reset loading, which would unmount the campaign page and its email editor.
  const userId = user?.id ?? null;
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    if (!userId) { setEnabled(false); setLoading(false); return; }
    setLoading(true);
    (supabase.rpc as any)('has_campaign_editor_access', { _user_id: userId })
      .then(({ data }: any) => { if (!cancelled) setEnabled(data === true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);
  return { enabled, loading };
};
