import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export type CrmAccessLevel = 'full' | 'trial' | 'readonly' | 'none';

interface Entitlement {
  status: string;
  mission_name: string | null;
  activated_at: string | null;
  expires_at: string | null;
  grace_ends_at: string | null;
  discount_eligible: boolean;
  welcome_dismissed_at: string | null;
}

/** ExportVins CRM trial state. Server-side RLS enforces the same rules. */
export const useCrmAccess = () => {
  const { user } = useAuth();
  const [level, setLevel] = useState<CrmAccessLevel>('full');
  const [ent, setEnt] = useState<Entitlement | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLevel('full'); setEnt(null); setLoading(false); return; }
    try {
      // Activates an invited trial on first login (no-op otherwise)
      const { data: act } = await (supabase.rpc as any)('activate_exportvins_trial');
      setEnt((act && act.id ? act : null) as Entitlement | null);
      const { data: lvl } = await (supabase.rpc as any)('crm_access_level', { _user_id: user.id });
      setLevel((lvl as CrmAccessLevel) || 'full');
    } catch (e) {
      console.warn('crm access check failed', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const isTrialAccount = !!ent && ['active', 'expired'].includes(ent.status) && level !== 'full';
  const daysLeft = ent?.expires_at
    ? Math.max(0, Math.ceil((new Date(ent.expires_at).getTime() - Date.now()) / 86400000))
    : 0;

  const dismissWelcome = async () => {
    await (supabase.rpc as any)('dismiss_exportvins_welcome');
    setEnt((e) => (e ? { ...e, welcome_dismissed_at: new Date().toISOString() } : e));
  };

  return {
    level,
    loading,
    isTrialAccount,
    isReadonly: level === 'readonly',
    isClosed: level === 'none',
    daysLeft,
    discountEligible: !!ent?.discount_eligible,
    missionName: ent?.mission_name ?? null,
    showWelcome: isTrialAccount && level === 'trial' && !ent?.welcome_dismissed_at,
    dismissWelcome,
    refetch: load,
  };
};
