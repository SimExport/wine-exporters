import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const LS_KEY = "onboarding_completed";

export interface OnboardingState {
  loading: boolean;
  completed: boolean;
  dismissed: boolean;
  shouldShow: boolean;
  progress: { domain: boolean; markets: boolean; campaign: boolean };
}

export function useOnboarding() {
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState>({
    loading: true,
    completed: false,
    dismissed: false,
    shouldShow: false,
    progress: { domain: false, markets: false, campaign: false },
  });
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => setVersion(v => v + 1), []);

  useEffect(() => {
    if (!user) {
      setState(s => ({ ...s, loading: false }));
      return;
    }
    let cancelled = false;
    (async () => {
      const cached = localStorage.getItem(LS_KEY) === "true";
      const [{ data: profile }, { count: campaignCount }] = await Promise.all([
        supabase.from("profiles")
          .select("onboarding_completed, onboarding_dismissed_at, domain_name, location, priority_markets")
          .eq("user_id", user.id).maybeSingle(),
        supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      if (cancelled) return;
      const completed = !!profile?.onboarding_completed || cached;
      const dismissed = !!profile?.onboarding_dismissed_at;
      if (completed) localStorage.setItem(LS_KEY, "true");
      setState({
        loading: false,
        completed,
        dismissed,
        shouldShow: !completed && !dismissed,
        progress: {
          domain: !!(profile?.domain_name && profile?.location),
          markets: !!profile?.priority_markets,
          campaign: (campaignCount ?? 0) > 0,
        },
      });
    })();
    return () => { cancelled = true; };
  }, [user, version]);

  return { ...state, refresh };
}